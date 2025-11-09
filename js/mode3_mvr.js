// =====================================================================
// mode3_mvr.js: 模式三 (MVR 容积式计算) 模块
// 版本: v4.0 (Volumetric) - 移除质量流量, 拆分出模式四
// 职责: 1. 初始化模式三 (容积式) 的 UI 事件
//        2. 执行基于 'rpm'/'vol' 输入的 MVR 能量平衡计算
//        3. 处理打印
// =====================================================================

import { updateFluidInfo } from './coolprop_loader.js';

// --- 模块内部变量 ---
let CP_INSTANCE = null;
let lastMode3ResultText = null;

// --- DOM 元素引用 ---
let calcButtonM3, resultsDivM3, calcFormM3, printButtonM3;
let fluidSelectM3, fluidInfoDivM3;
let allInputsM3;

// --- 按钮状态常量 ---
const btnText = "计算喷水量 (模式三)";
const btnTextStale = "重新计算 (模式三)";
const classesFresh = ['bg-purple-600', 'hover:bg-purple-700', 'text-white'];
const classesStale = ['bg-yellow-500', 'hover:bg-yellow-600', 'text-black'];

/**
 * 设置按钮为“脏”状态 (Stale)
 */
function setButtonStale() {
    calcButtonM3.textContent = btnTextStale;
    calcButtonM3.classList.remove(...classesFresh);
    calcButtonM3.classList.add(...classesStale);
    printButtonM3.disabled = true;
    lastMode3ResultText = null;
}

/**
 * 设置按钮为“新”状态 (Fresh)
 */
function setButtonFresh() {
    calcButtonM3.textContent = btnText;
    calcButtonM3.classList.remove(...classesStale);
    calcButtonM3.classList.add(...classesFresh);
}


/**
 * (v4.0) 模式三：主计算函数 (MVR 容积式)
 */
function calculateMode3() {
    try {
        // --- A. 获取所有输入值 ---
        const fluid = fluidSelectM3.value; // 'Water'
        
        // 压缩机
        const flow_mode_m3 = document.querySelector('input[name="flow_mode_m3"]:checked').value; // 'rpm', 'vol'
        const eta_s_m3 = parseFloat(document.getElementById('eta_s_m3').value);
        const eta_v_m3 = parseFloat(document.getElementById('eta_v_m3').value);
        
        // 工艺入口
        const inlet_mode_m3 = document.querySelector('input[name="inlet_mode_m3"]:checked').value;
        const Te_C_in = parseFloat(document.getElementById('temp_evap_m3').value);
        const Pe_bar_in = parseFloat(document.getElementById('press_evap_m3').value);
        const superheat_in_K = parseFloat(document.getElementById('superheat_in_m3').value);
        
        // 工艺出口
        const outlet_mode_m3 = document.querySelector('input[name="outlet_mode_m3"]:checked').value;
        const Tc_C_in = parseFloat(document.getElementById('temp_cond_m3').value);
        const Pc_bar_in = parseFloat(document.getElementById('press_cond_m3').value);
        const superheat_out_K = parseFloat(document.getElementById('superheat_out_m3').value);
        
        // 喷水
        const T_water_in_C = parseFloat(document.getElementById('temp_water_in_m3').value);
        
        // 校验 (基础)
        if (isNaN(eta_s_m3) || isNaN(eta_v_m3) || isNaN(superheat_in_K) || isNaN(superheat_out_K) || isNaN(T_water_in_C)) {
            throw new Error("效率、过热度或喷水温度包含无效数字。");
        }
        if (eta_s_m3 <= 0 || eta_v_m3 <= 0) {
             throw new Error("效率必须大于零。");
        }

        // --- (v3.4) B. 标准化工艺压力 (Pe_Pa, Pc_Pa) 和饱和温度 (T_sat_in_K, T_sat_out_K) ---
        let Pe_Pa, T_sat_in_K;
        if (inlet_mode_m3 === 'temp') {
            if (isNaN(Te_C_in)) throw new Error("入口饱和温度无效。");
            T_sat_in_K = Te_C_in + 273.15;
            Pe_Pa = CP_INSTANCE.PropsSI('P', 'T', T_sat_in_K, 'Q', 1, fluid);
        } else {
            if (isNaN(Pe_bar_in) || Pe_bar_in <= 0) throw new Error("入口饱和压力无效。");
            Pe_Pa = Pe_bar_in * 1e5;
            T_sat_in_K = CP_INSTANCE.PropsSI('T', 'P', Pe_Pa, 'Q', 1, fluid);
        }
        
        let Pc_Pa, T_sat_out_K;
        if (outlet_mode_m3 === 'temp') {
            if (isNaN(Tc_C_in)) throw new Error("出口饱和温度无效。");
            T_sat_out_K = Tc_C_in + 273.15;
            Pc_Pa = CP_INSTANCE.PropsSI('P', 'T', T_sat_out_K, 'Q', 1, fluid);
        } else {
            if (isNaN(Pc_bar_in) || Pc_bar_in <= 0) throw new Error("出口饱和压力无效。");
            Pc_Pa = Pc_bar_in * 1e5;
            T_sat_out_K = CP_INSTANCE.PropsSI('T', 'P', Pc_Pa, 'Q', 1, fluid);
        }

        if (Pc_Pa <= Pe_Pa) {
            throw new Error("出口压力必须高于入口压力。");
        }
        
        // --- (v3.4) C. 计算实际入口状态 (State 1) ---
        let T_1_actual_K, h_1_actual, s_1_actual, rho_1_actual;
        if (superheat_in_K > 0) {
            T_1_actual_K = T_sat_in_K + superheat_in_K;
            h_1_actual = CP_INSTANCE.PropsSI('H', 'T', T_1_actual_K, 'P', Pe_Pa, fluid);
            s_1_actual = CP_INSTANCE.PropsSI('S', 'T', T_1_actual_K, 'P', Pe_Pa, fluid);
            rho_1_actual = CP_INSTANCE.PropsSI('D', 'T', T_1_actual_K, 'P', Pe_Pa, fluid);
        } else {
            // (v3.4 修正) 0过热度, 明确使用 Q=1 (饱和蒸汽)
            T_1_actual_K = T_sat_in_K;
            h_1_actual = CP_INSTANCE.PropsSI('H', 'P', Pe_Pa, 'Q', 1, fluid);
            s_1_actual = CP_INSTANCE.PropsSI('S', 'P', Pe_Pa, 'Q', 1, fluid);
            rho_1_actual = CP_INSTANCE.PropsSI('D', 'P', Pe_Pa, 'Q', 1, fluid);
        }

        // --- (v3.5) D. 计算实际目标出口状态 (State 2 Target) ---
        let T_2_target_K, h_2_target;
        if (superheat_out_K > 0) {
            T_2_target_K = T_sat_out_K + superheat_out_K;
            h_2_target = CP_INSTANCE.PropsSI('H', 'T', T_2_target_K, 'P', Pc_Pa, fluid);
        } else {
            // (v3.5 修正) 0过热度, 明确使用 Q=1 (饱和蒸汽)
            T_2_target_K = T_sat_out_K; // 目标温度即为饱和温度
            h_2_target = CP_INSTANCE.PropsSI('H', 'P', Pc_Pa, 'Q', 1, fluid);
        }


        // --- (v3.4) E. 计算喷水入口状态 (water_in) ---
        const T_water_in_K = T_water_in_C + 273.15;
        // 关键修正 (v3.3): 必须使用 "R718" (水的无歧义制冷剂编号)
        const h_water_in = CP_INSTANCE.PropsSI('H', 'T', T_water_in_K, 'Q', 0, "R718");


        // --- (v4.0) F. 计算流量和功率 (仅容积式) ---
        let m_dot_gas, V_th_m3_s, V_act_m3_s;

        // (v4.0) 模式: 按体积
        if (flow_mode_m3 === 'rpm') {
            const rpm_val = parseFloat(document.getElementById('rpm_m3').value);
            const displacement_m3 = parseFloat(document.getElementById('displacement_m3').value);
            if (isNaN(rpm_val) || isNaN(displacement_m3) || rpm_val <= 0 || displacement_m3 <= 0) {
                throw new Error("转速和排量必须是大于零的数字。");
            }
            V_th_m3_s = (displacement_m3 / 1e6) * (rpm_val / 60);
        } else { // 'vol'
            const flow_val = parseFloat(document.getElementById('flow_m3').value);
            const flow_unit = document.getElementById('flow_unit_m3').value;
            if (isNaN(flow_val) || flow_val <= 0) {
                throw new Error("理论体积流量必须是大于零的数字。");
            }
            if (flow_unit === 'm3/h') {
                V_th_m3_s = flow_val / 3600;
            } else if (flow_unit === 'L/min') {
                V_th_m3_s = flow_val / 1000 / 60;
            } else { // m3/s
                V_th_m3_s = flow_val;
            }
        }
        V_act_m3_s = V_th_m3_s * eta_v_m3;
        m_dot_gas = V_act_m3_s * rho_1_actual; // m_dot = V_act * rho

        // (v4.0) 移除 "mass" 模式
        
        // --- F.1: 计算功率 ---
        // F.1.1: 找到干式压缩的等熵出口 (2s)
        const h_2s = CP_INSTANCE.PropsSI('H', 'P', Pc_Pa, 'S', s_1_actual, fluid);
        const T_2s_K = CP_INSTANCE.PropsSI('T', 'P', Pc_Pa, 'S', s_1_actual, fluid);
        
        // F.1.2: 计算干式等熵功率 (Ws) 和实际轴功率 (W_shaft)
        const Ws_W = m_dot_gas * (h_2s - h_1_actual);
        const W_shaft_W = Ws_W / eta_s_m3;

        // --- G. (v3.4) 求解喷水量 (m_dot_water) ---
        // ... (此段逻辑无变化) ...
        const energy_from_gas_h_change = m_dot_gas * (h_2_target - h_1_actual);
        const energy_excess_W = W_shaft_W - energy_from_gas_h_change;
        const energy_per_kg_water = h_2_target - h_water_in;

        if (energy_per_kg_water <= 0) {
            throw new Error(`计算错误：每kg喷水吸收的能量 (h2_target - h_water_in) 小于等于零。 (${(energy_per_kg_water/1000).toFixed(2)} kJ/kg)`);
        }
        
        if (energy_excess_W < 0) {
            const h_2a_dry = (W_shaft_W / m_dot_gas) + h_1_actual;
            const T_2a_dry_K = CP_INSTANCE.PropsSI('T', 'P', Pc_Pa, 'H', h_2a_dry, fluid);
            
            throw new Error(
`计算错误：无需喷水。
压缩机干式排气温度 (${(T_2a_dry_K - 273.15).toFixed(2)} °C) 已低于
目标排气温度 (${(T_2_target_K - 273.15).toFixed(2)} °C)。
(多余能量: ${(energy_excess_W / 1000).toFixed(2)} kW)。
请检查效率输入或提高“目标出口过热度”。`
            );
        }
        
        const m_dot_water = energy_excess_W / energy_per_kg_water;
        
        // --- H. (v3.4) 格式化输出 ---
        // ... (输出内容无变化, 因为 V_th_m3_s, V_act_m3_s, m_dot_gas 仍然被计算) ...
        let output = `
--- 工艺状态点 ---
入口 (Inlet):
  吸气饱和压力: ${(Pe_Pa / 1e5).toFixed(3)} bar
  吸气饱和温度: ${(T_sat_in_K - 273.15).toFixed(2)} °C
  吸气实际温度: ${(T_1_actual_K - 273.15).toFixed(2)} °C (过热: ${superheat_in_K} K)
  (h1_actual: ${(h_1_actual / 1000).toFixed(2)} kJ/kg, s1_actual: ${(s_1_actual / 1000).toFixed(4)} kJ/kg·K)
出口 (Outlet):
  排气饱和压力: ${(Pc_Pa / 1e5).toFixed(3)} bar
  排气饱和温度: ${(T_sat_out_K - 273.15).toFixed(2)} °C
  目标排气温度: ${(T_2_target_K - 273.15).toFixed(2)} °C (过热: ${superheat_out_K} K)
  (h2_target: ${(h_2_target / 1000).toFixed(2)} kJ/kg)
喷水 (Spray):
  喷水入口温度: ${T_water_in_C.toFixed(2)} °C
  (h_water_in [R718]: ${(h_water_in / 1000).toFixed(2)} kJ/kg)

--- 干式压缩机性能 (无喷水) ---
理论排量 (V_th): ${V_th_m3_s.toFixed(5)} m³/s (${(V_th_m3_s * 3600).toFixed(2)} m³/h)
实际吸气 (V_act): ${V_act_m3_s.toFixed(5)} m³/s (基于 η_v = ${eta_v_m3.toFixed(3)})
干蒸汽质量流 (m_dot_gas): ${m_dot_gas.toFixed(5)} kg/s (${(m_dot_gas * 3600).toFixed(2)} kg/h)

--- 功率平衡 (能量平衡法) ---
干式等熵出口 (T2s): ${(T_2s_K - 273.15).toFixed(2)} °C (h2s: ${(h_2s / 1000).toFixed(2)} kJ/kg)
干式等熵功率 (Ws):   ${(Ws_W / 1000).toFixed(3)} kW
实际轴功率 (W_shaft): ${(W_shaft_W / 1000).toFixed(3)} kW (基于 η_s = ${eta_s_m3.toFixed(3)})
---
蒸汽焓升所需功率:     ${(energy_from_gas_h_change / 1000).toFixed(3)} kW
  (备注: m_dot_gas * (h2_target - h1_actual))
需喷水带走的热量:     ${(energy_excess_W / 1000).toFixed(3)} kW
  (备注: W_shaft - 蒸汽焓升所需功率)
每kg水可吸收热量:   ${(energy_per_kg_water / 1000).toFixed(2)} kJ/kg
  (备注: h2_target - h_water_in)

========================================
           MVR 喷水计算结果
========================================
所需喷水量 (m_dot_water): ${m_dot_water.toFixed(5)} kg/s
  (约等于: ${(m_dot_water * 3600).toFixed(3)} kg/h)

--- 最终出口状态 ---
总出口质量流 (m_dot_total): ${(m_dot_gas + m_dot_water).toFixed(5)} kg/s
出口混合物干度 (Q_out):       ${(m_dot_gas / (m_dot_gas + m_dot_water)).toFixed(4)}
`;

        resultsDivM3.textContent = output;
        lastMode3ResultText = output; // 存储纯文本

        setButtonFresh();
        printButtonM3.disabled = false;

    } catch (error) {
        resultsDivM3.textContent = `计算出错: ${error.message}\n\n请检查输入参数是否在工质的有效范围内。`;
        console.error(error);
        lastMode3ResultText = null;
        printButtonM3.disabled = true;
    }
}

/**
 * (v4.0) 准备模式三的打印报告 (容积式)
 */
function printReportMode3() {
    if (!lastMode3ResultText) {
        alert("没有可打印的结果。");
        return;
    }
    
    const flow_mode_val = document.querySelector('input[name="flow_mode_m3"]:checked').value;
    let flow_mode_desc = '';
    if (flow_mode_val === 'rpm') {
        flow_mode_desc = '按转速与排量';
    } else if (flow_mode_val === 'vol') {
        flow_mode_desc = '按体积流量';
    }

    const inputs = {
        "报告类型": `模式三: MVR 容积式计算 (v4.0)`, // 版本更新
        "工质": fluidSelectM3.value,
        "理论输气量模式": flow_mode_desc,
        "转速 (RPM)": document.getElementById('rpm_m3').value,
        "每转排量 (cm³/rev)": document.getElementById('displacement_m3').value,
        "理论体积流量": document.getElementById('flow_m3').value + " " + document.getElementById('flow_unit_m3').value,
        // (v4.0) 移除 "理论质量流量"
        "等熵效率 (η_s)": document.getElementById('eta_s_m3').value,
        "容积效率 (η_v)": document.getElementById('eta_v_m3').value,
        "入口状态定义": document.querySelector('input[name="inlet_mode_m3"]:checked').value === 'temp' ? '按饱和温度' : '按饱和压力',
        "入口饱和温度 (°C)": document.getElementById('temp_evap_m3').value,
        "入口饱和压力 (bar)": document.getElementById('press_evap_m3').value,
        "入口过热度 (K)": document.getElementById('superheat_in_m3').value,
        "出口状态定义": document.querySelector('input[name="outlet_mode_m3"]:checked').value === 'temp' ? '按饱和温度' : '按饱和压力',
        "出口饱和温度 (°C)": document.getElementById('temp_cond_m3').value,
        "出口饱和压力 (bar)": document.getElementById('press_cond_m3').value,
        "目标出口过热度 (K)": document.getElementById('superheat_out_m3').value,
        "喷水温度 (°C)": document.getElementById('temp_water_in_m3').value,
    };

    let printHtml = `
        <h1>压缩机性能计算报告</h1>
        <p>计算时间: ${new Date().toLocaleString('zh-CN')}</p>
        <h2>1. 输入参数 (模式三)</h2>
        <table class="print-table">
            ${Object.entries(inputs).map(([key, value]) => `
                <tr>
                    <th>${key}</th>
                    <td>${value}</td>
                </tr>
            `).join('')}
        </table>
        <h2>2. 计算结果 (模式三)</h2>
        <pre class="print-results">${lastMode3ResultText}</pre>
        <h3>--- 报告结束 (编者: 荆炎荣) ---</h3>
    `;

    callPrint(printHtml);
}

/**
 * 打印报告的核心函数 (模块内)
 * @param {string} printHtml - 要打印的 HTML 内容
 */
function callPrint(printHtml) {
    let printContainer = document.getElementById('print-container');
    if (printContainer) {
        printContainer.remove();
    }
    printContainer = document.createElement('div');
    printContainer.id = 'print-container';
    printContainer.innerHTML = printHtml;
    document.body.appendChild(printContainer);
    window.print();
    setTimeout(() => {
        if (document.body.contains(printContainer)) {
            document.body.removeChild(printContainer);
        }
    }, 500);
}


/**
 * (v4.0) 模式三：初始化函数
 * @param {object} CP - CoolProp 实例
 */
export function initMode3(CP) {
    CP_INSTANCE = CP; // 将 CP 实例存储在模块作用域
    
    // 获取 DOM 元素
    calcButtonM3 = document.getElementById('calc-button-mode-3');
    resultsDivM3 = document.getElementById('results-mode-3');
    calcFormM3 = document.getElementById('calc-form-mode-3');
    printButtonM3 = document.getElementById('print-button-mode-3');
    fluidSelectM3 = document.getElementById('fluid_m3');
    fluidInfoDivM3 = document.getElementById('fluid-info-m3');
    allInputsM3 = calcFormM3.querySelectorAll('input, select');

    // 绑定计算事件
    calcFormM3.addEventListener('submit', (event) => {
        event.preventDefault();
        calculateMode3();
    });

    // 绑定“脏”状态检查
    allInputsM3.forEach(input => {
        input.addEventListener('input', setButtonStale);
        input.addEventListener('change', setButtonStale);
    });

    // 绑定流体信息更新 (虽然被禁用, 但在未来启用时有用)
    fluidSelectM3.addEventListener('change', () => {
        updateFluidInfo(fluidSelectM3, fluidInfoDivM3, CP_INSTANCE);
    });

    // 绑定打印按钮
    printButtonM3.addEventListener('click', printReportMode3);
    
    console.log("模式三 (MVR v4.0 容积式) 已初始化。");
}