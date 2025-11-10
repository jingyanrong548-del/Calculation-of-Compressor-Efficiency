// =====================================================================
// ui.js: UI 界面交互逻辑
// 版本: v4.4 (界面重构)
// 职责: 1. (v4.4) 处理主选项卡 (M1, M2, M3, M4)
//        2. (v4.4) [已移除] M1/M2 模式电台逻辑
//        3. 处理所有流量模式电台 (v4.3 bug 修复)
//        4. 处理 MVR 状态定义电台
//        5. 处理后冷却器复选框
//        6. 处理 M2A / M2B 子选项卡 (v4.4 移除 radio 依赖)
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- (v4.4) 主选项卡切换 (M1, M2, M3, M4) ---
    const tabBtnM1 = document.getElementById('tab-btn-m1');
    const tabBtnM2 = document.getElementById('tab-btn-m2');
    const tabBtnM3 = document.getElementById('tab-btn-m3');
    const tabBtnM4 = document.getElementById('tab-btn-m4');
    
    const contentM1 = document.getElementById('tab-content-m1');
    const contentM2 = document.getElementById('tab-content-m2');
    const contentM3 = document.getElementById('tab-content-m3');
    const contentM4 = document.getElementById('tab-content-m4');

    const tabs = [
        { btn: tabBtnM1, content: contentM1 },
        { btn: tabBtnM2, content: contentM2 },
        { btn: tabBtnM3, content: contentM3 },
        { btn: tabBtnM4, content: contentM4 }
    ];

    tabs.forEach(tab => {
        // 确保按钮和内容都存在
        if (tab.btn && tab.content) {
            tab.btn.addEventListener('click', () => {
                // 1. 重置所有
                tabs.forEach(t => {
                    if (t.btn && t.content) {
                        t.btn.classList.remove('active');
                        t.content.style.display = 'none';
                        t.content.classList.remove('active');
                    }
                });
                // 2. 激活当前
                tab.btn.classList.add('active');
                tab.content.style.display = 'block';
                tab.content.classList.add('active');
            });
        }
    });

    // --- (v4.4) [已删除] 模式一 / 模式二 电台切换 ---
    // (此逻辑已被 4 个一级标签页取代)


    // --- 流量模式 (Flow Mode) 电台切换 ---
    // Helper function to setup flow mode toggles
    /**
     * (v4.3 修复)
     * 修复了硬编码 'rpm' 导致的模式四 (mass/vol) 切换逻辑错误
     */
    function setupFlowModeToggle(radioName, firstInputsId, secondInputsId) {
        const radios = document.querySelectorAll(`input[name="${radioName}"]`);
        const firstInputs = document.getElementById(firstInputsId);
        const secondInputs = document.getElementById(secondInputsId);

        if (!radios.length || !firstInputs || !secondInputs) return;

        // [FIX] 动态获取第一个单选按钮的 value (例如 'rpm' 或 'mass')
        // 这假设 HTML 中单选按钮的顺序与参数传入的 ID 顺序一致
        const firstValue = radios[0].value;

        const toggle = (val) => {
            if (val === firstValue) { // [FIX] 不再硬编码 'rpm', 而是比较 firstValue
                firstInputs.style.display = 'block';
                secondInputs.style.display = 'none';
                firstInputs.querySelectorAll('input').forEach(i => i.required = true);
                secondInputs.querySelectorAll('input').forEach(i => i.required = false);
            } else {
                firstInputs.style.display = 'none';
                secondInputs.style.display = 'block';
                firstInputs.querySelectorAll('input').forEach(i => i.required = false);
                secondInputs.querySelectorAll('input').forEach(i => i.required = true);
            }
        };

        radios.forEach(radio => {
            radio.addEventListener('change', () => toggle(radio.value));
        });
        
        // 初始状态
        const checkedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
        if (checkedRadio) {
            toggle(checkedRadio.value);
        }
    }

    setupFlowModeToggle('flow_mode', 'rpm-inputs-m1', 'vol-inputs-m1');
    setupFlowModeToggle('flow_mode_m2', 'rpm-inputs-m2', 'vol-inputs-m2');
    setupFlowModeToggle('flow_mode_m2b', 'rpm-inputs-m2b', 'vol-inputs-m2b'); // v4.2 新增
    setupFlowModeToggle('flow_mode_m3', 'rpm-inputs-m3', 'vol-inputs-m3');
    setupFlowModeToggle('flow_mode_m4', 'mass-inputs-m4', 'vol-inputs-m4'); // M4 是 mass/vol
    

    // --- 功率模式 (Power Mode) 切换 ---
    function setupPowerModeToggle(radioName, motorEffGroupId) {
        const radios = document.querySelectorAll(`input[name="${radioName}"]`);
        const motorEffGroup = document.getElementById(motorEffGroupId);

        if (!radios.length || !motorEffGroup) return;

        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'input') {
                    motorEffGroup.style.display = 'block';
                    motorEffGroup.querySelector('input').required = true;
                } else {
                    motorEffGroup.style.display = 'none';
                    motorEffGroup.querySelector('input').required = false;
                }
            });
        });
        
        // 初始状态
        const checkedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
        if (checkedRadio) {
             checkedRadio.dispatchEvent(new Event('change'));
        }
    }
    
    setupPowerModeToggle('power_mode', 'motor-eff-group-m1');
    setupPowerModeToggle('eff_mode_m2', 'motor-eff-group-m2'); // M2 效率模式
    setupPowerModeToggle('eff_mode_m2b', 'motor-eff-group-m2b'); // M2B 效率模式 (v4.2 新增)


    // --- 容量模式 (Capacity Mode) 切换 ---
    const capacityRadios = document.querySelectorAll('input[name="capacity_mode"]');
    const capacityLabel = document.getElementById('capacity-label');
    if (capacityRadios.length && capacityLabel) {
        capacityRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'heating') {
                    capacityLabel.textContent = '制热量 (kW)';
                } else {
                    capacityLabel.textContent = '制冷量 (kW)';
                }
            });
        });
    }
    
    // --- 功率标签 (Power Label) 切换 ---
    const powerRadios = document.querySelectorAll('input[name="power_mode"]');
    const powerLabel = document.getElementById('power-label');
    if(powerRadios.length && powerLabel) {
        powerRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'input') {
                    powerLabel.textContent = '输入功率 (kW) (电机)';
                } else {
                    powerLabel.textContent = '轴功率 (kW)';
                }
            });
        });
    }

    // --- M2 效率标签 (Efficiency Label) 切换 ---
    const effRadiosM2 = document.querySelectorAll('input[name="eff_mode_m2"]');
    const effLabelM2 = document.getElementById('eta_s_label_m2');
    const effTooltipM2 = document.getElementById('tooltip-eta-s-m2');
    if (effRadiosM2.length && effLabelM2 && effTooltipM2) {
        effRadiosM2.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'input') {
                    effLabelM2.childNodes[0].nodeValue = '总等熵效率 (η_total) ';
                    effTooltipM2.textContent = '基于【输入功率】。η_total = 理论等熵功率 / 电机输入功率。';
                } else {
                    effLabelM2.childNodes[0].nodeValue = '等熵效率 (η_s) ';
                    effTooltipM2.textContent = '基于【轴功率】。η_s = 理论等熵功率 / 压缩机轴功率。';
                }
            });
        });
    }

    // --- M2B 效率标签 (Efficiency Label) 切换 (v4.2 新增) ---
    const effRadiosM2B = document.querySelectorAll('input[name="eff_mode_m2b"]');
    const effLabelM2B = document.getElementById('eta_s_label_m2b');
    const effTooltipM2B = document.getElementById('tooltip-eta-s-m2b');
    if (effRadiosM2B.length && effLabelM2B && effTooltipM2B) {
        effRadiosM2B.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'input') {
                    effLabelM2B.childNodes[0].nodeValue = '总等熵效率 (η_total) ';
                    effTooltipM2B.textContent = '基于【输入功率】。η_total = 理论等熵功率 / 电机输入功率。';
                } else {
                    effLabelM2B.childNodes[0].nodeValue = '等熵效率 (η_s) ';
                    effTooltipM2B.textContent = '基于【轴功率】。η_s = 理论等熵功率 / 压缩机轴功率。';
                }
            });
        });
    }

    // --- MVR 状态定义 (Inlet/Outlet) 电台切换 ---
    function setupStateToggle(radioName, tempInputDivId, pressInputDivId) {
        const radios = document.querySelectorAll(`input[name="${radioName}"]`);
        const tempDiv = document.getElementById(tempInputDivId);
        const pressDiv = document.getElementById(pressInputDivId);

        if (!radios.length || !tempDiv || !pressDiv) return;

        const toggle = (val) => {
            if (val === 'temp') {
                tempDiv.style.display = 'block';
                pressDiv.style.display = 'none';
                tempDiv.querySelector('input').required = true;
                pressDiv.querySelector('input').required = false;
            } else {
                tempDiv.style.display = 'none';
                pressDiv.style.display = 'block';
                tempDiv.querySelector('input').required = false;
                pressDiv.querySelector('input').required = true;
            }
        };

        radios.forEach(radio => {
            radio.addEventListener('change', () => toggle(radio.value));
        });
        
        // 初始状态
        const checkedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
        if (checkedRadio) {
            toggle(checkedRadio.value);
        }
    }

    setupStateToggle('inlet_mode_m3', 'inlet-temp-m3', 'inlet-press-m3');
    setupStateToggle('outlet_mode_m3', 'outlet-temp-m3', 'outlet-press-m3');
    setupStateToggle('inlet_mode_m4', 'inlet-temp-m4', 'inlet-press-m4');
    setupStateToggle('outlet_mode_m4', 'outlet-temp-m4', 'outlet-press-m4');


    // --- 后冷却器 (Cooler) 复选框 ---
    function setupCoolerToggle(checkboxId, inputsDivId) {
        const checkbox = document.getElementById(checkboxId);
        const inputsDiv = document.getElementById(inputsDivId);
        
        if (!checkbox || !inputsDiv) return;

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                inputsDiv.style.display = 'block';
            } else {
                inputsDiv.style.display = 'none';
            }
        });
    }
    
    setupCoolerToggle('enable_cooler_calc_m2', 'cooler-inputs-m2');
    setupCoolerToggle('enable_cooler_calc_m2b', 'cooler-inputs-m2b'); // v4.2 新增
    
    // ==========================================================
    // v4.2 新增: 模式 2A / 2B 子选项卡切换
    // (v4.4 重构: 移除对 M1/M2 radio 的依赖)
    // ==========================================================
    const tabBtn2A = document.getElementById('tab-btn-mode-2a');
    const tabBtn2B = document.getElementById('tab-btn-mode-2b');
    const content2A = document.getElementById('mode-2a-content');
    const content2B = document.getElementById('mode-2b-content');

    if (tabBtn2A && tabBtn2B && content2A && content2B) {
        tabBtn2A.addEventListener('click', () => {
            tabBtn2A.classList.add('active');
            tabBtn2B.classList.remove('active');
            content2A.style.display = 'block';
            content2B.style.display = 'none';
            
            // [DELETED v4.4] 移除对 M1/M2 radio 的反向控制
        });

        tabBtn2B.addEventListener('click', () => {
            tabBtn2B.classList.add('active');
            tabBtn2A.classList.remove('active');
            content2B.style.display = 'block';
            content2A.style.display = 'none';
            
            // [DELETED v4.4] 移除对 M1/M2 radio 的反向控制
        });
    }

});