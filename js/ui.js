// =====================================================================
// ui.js: 界面交互模块
// 版本: v4.1 (MVR 拆分)
// 职责: 1. 处理主选项卡 (Tabs) 切换 (v4.0: 3个)
//        2. 处理干式压缩内部的模式 1/2 切换
//        3. 处理所有模式中共用的表单 UI 逻辑
// =====================================================================

/**
 * 辅助函数：设置流量模式 (RPM vs 体积) 的 UI 切换
 * @param {string} modeSelector - 'name' 属性选择器, e.g., "input[name='flow_mode']"
 * @param {string} rpmContainerId - RPM 输入组的 ID
 * @param {string} volContainerId - 体积流量输入组的 ID
 * @param {string} displacementInputId - 排量 input 的 ID
 * @param {string} flowInputId - 流量 input 的 ID
 */
function setupFlowModeToggle(modeSelector, rpmContainerId, volContainerId, displacementInputId, flowInputId) {
    const radios = document.querySelectorAll(modeSelector);
    const rpmInputs = document.getElementById(rpmContainerId);
    const volInputs = document.getElementById(volContainerId);
    const displacementInput = document.getElementById(displacementInputId);
    const flowInput = document.getElementById(flowInputId);

    // 检查元素是否存在
    if (!rpmInputs || !volInputs || !displacementInput || !flowInput || radios.length === 0) {
        console.error("FlowModeToggle: 缺少一个或多个 DOM 元素");
        return;
    }

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'rpm') {
                rpmInputs.style.display = 'block';
                volInputs.style.display = 'none';
                displacementInput.required = true;
                flowInput.required = false;
            } else {
                rpmInputs.style.display = 'none';
                volInputs.style.display = 'block';
                displacementInput.required = false;
                flowInput.required = true;
            }
        });
    });
    
    // 触发一次 change 事件以确保初始状态正确
    document.querySelector(`${modeSelector}[checked]`).dispatchEvent(new Event('change'));
}

/**
 * 辅助函数：设置模式一的功率模式 UI 切换
 */
function setupMode1PowerToggle() {
    const radios = document.querySelectorAll("input[name='power_mode']");
    const powerLabel = document.getElementById('power-label');
    const motorEffGroup = document.getElementById('motor-eff-group-m1');
    const motorEffInput = document.getElementById('motor_eff');

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'shaft') {
                powerLabel.textContent = '轴功率 (kW)';
                motorEffGroup.style.display = 'none';
                motorEffInput.required = false;
            } else {
                powerLabel.textContent = '输入功率 (kW) (电机)';
                motorEffGroup.style.display = 'block';
                motorEffInput.required = true;
            }
        });
    });
    document.querySelector("input[name='power_mode'][checked]").dispatchEvent(new Event('change'));
}

/**
 * 辅助函数：设置模式一的容量模式 UI 切换
 */
function setupMode1CapacityToggle() {
    const radios = document.querySelectorAll("input[name='capacity_mode']");
    const capacityLabel = document.getElementById('capacity-label');

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'refrigeration') {
                capacityLabel.textContent = '制冷量 (kW)';
            } else {
                capacityLabel.textContent = '制热量 (kW)';
            }
        });
    });
    document.querySelector("input[name='capacity_mode'][checked]").dispatchEvent(new Event('change'));
}

/**
 * 辅助函数：设置模式二的效率模式 UI 切换
 */
function setupMode2EffToggle() {
    const radios = document.querySelectorAll("input[name='eff_mode_m2']");
    const etaSLabel = document.getElementById('eta_s_label_m2');
    const tooltipEtaS = document.getElementById('tooltip-eta-s-m2');
    const motorEffGroup = document.getElementById('motor-eff-group-m2');
    const motorEffInput = document.getElementById('motor_eff_m2');

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'shaft') {
                etaSLabel.childNodes[0].nodeValue = '等熵效率 (η_s) ';
                tooltipEtaS.textContent = '基于【轴功率】。η_s = 理论等熵功率 / 压缩机轴功率。';
                motorEffGroup.style.display = 'none';
                motorEffInput.required = false;
            } else {
                etaSLabel.childNodes[0].nodeValue = '总等熵效率 (η_total) ';
                tooltipEtaS.textContent = '基于【输入功率】。η_total = 理论等熵功率 / 电机输入功率。';
                motorEffGroup.style.display = 'block';
                motorEffInput.required = true;
            }
        });
    });
    document.querySelector("input[name='eff_mode_m2'][checked]").dispatchEvent(new Event('change'));
}

/**
 * 辅助函数：设置模式二的后冷却器 UI 切换
 */
function setupMode2CoolerToggle() {
    const checkbox = document.getElementById('enable_cooler_calc_m2');
    const coolerInputs = document.getElementById('cooler-inputs-m2');
    const targetTempInput = document.getElementById('target_temp_m2');

    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            coolerInputs.style.display = 'block';
            targetTempInput.required = true;
        } else {
            coolerInputs.style.display = 'none';
            targetTempInput.required = false;
        }
    });
    coolerInputs.style.display = 'none';
    targetTempInput.required = false;
}

/**
 * (v3.1) 辅助函数：设置模式三/四的 P/T 切换
 * @param {string} radioName - 'name' 属性, e.g., "inlet_mode_m3"
 * @param {string} tempContainerId - 温度输入组的 ID
 * @param {string} pressContainerId - 压力输入组的 ID
 * @param {string} tempInputId - 温度 input 的 ID
 * @param {string} pressInputId - 压力 input 的 ID
 */
function setupMode3PTToggle(radioName, tempContainerId, pressContainerId, tempInputId, pressInputId) {
    const radios = document.querySelectorAll(`input[name='${radioName}']`);
    const tempGroup = document.getElementById(tempContainerId);
    const pressGroup = document.getElementById(pressContainerId);
    const tempInput = document.getElementById(tempInputId);
    const pressInput = document.getElementById(pressInputId);

    if (!tempGroup || !pressGroup || !tempInput || !pressInput || radios.length === 0) {
        console.error("Mode3PTToggle: 缺少一个或多个 DOM 元素");
        return;
    }

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'temp') {
                tempGroup.style.display = 'block';
                pressGroup.style.display = 'none';
                tempInput.required = true;
                pressInput.required = false;
            } else {
                tempGroup.style.display = 'none';
                pressGroup.style.display = 'block';
                tempInput.required = false;
                pressInput.required = true;
            }
        });
    });
    // 触发初始状态
    document.querySelector(`input[name='${radioName}'][checked]`).dispatchEvent(new Event('change'));
}

/**
 * (v4.1 新增) 辅助函数：设置模式四的流量模式 (Mass vs Vol) UI 切换
 */
function setupMode4FlowToggle() {
    const radios = document.querySelectorAll("input[name='flow_mode_m4']");
    const massInputs = document.getElementById('mass-inputs-m4');
    const volInputs = document.getElementById('vol-inputs-m4');
    const massFlowInput = document.getElementById('flow_mass_m4');
    const volFlowInput = document.getElementById('flow_vol_m4');

    if (!massInputs || !volInputs || !massFlowInput || !volFlowInput || radios.length === 0) {
        console.error("Mode4FlowToggle: 缺少一个或多个 DOM 元素");
        return;
    }

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'mass') {
                massInputs.style.display = 'block';
                volInputs.style.display = 'none';
                massFlowInput.required = true;
                volFlowInput.required = false;
            } else { // 'vol'
                massInputs.style.display = 'none';
                volInputs.style.display = 'block';
                massFlowInput.required = false;
                volFlowInput.required = true;
            }
        });
    });
    
    // 触发一次 change 事件以确保初始状态正确
    document.querySelector("input[name='flow_mode_m4'][checked]").dispatchEvent(new Event('change'));
}


/**
 * 主 UI 初始化函数
 * 由 main.js 在物性库加载成功后调用
 */
export function initUI() {
    
    // --- 1. (v4.0) 主选项卡 (Tab) 切换逻辑 (3个) ---
    const tabBtnDry = document.getElementById('tab-btn-dry');
    const tabBtnMvr = document.getElementById('tab-btn-mvr');
    const tabBtnTurbo = document.getElementById('tab-btn-turbo');
    const tabContentDry = document.getElementById('tab-content-dry');
    const tabContentMvr = document.getElementById('tab-content-mvr');
    const tabContentTurbo = document.getElementById('tab-content-turbo');

    const allTabs = [tabBtnDry, tabBtnMvr, tabBtnTurbo];
    const allContents = [tabContentDry, tabContentMvr, tabContentTurbo];

    function switchTab(activeIndex) {
        allTabs.forEach((tab, index) => {
            if (index === activeIndex) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        allContents.forEach((content, index) => {
            if (index === activeIndex) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    tabBtnDry.addEventListener('click', () => switchTab(0));
    tabBtnMvr.addEventListener('click', () => switchTab(1));
    tabBtnTurbo.addEventListener('click', () => switchTab(2));


    // --- 2. 模式 1 / 模式 2 内部切换逻辑 ---
    const mode1Radio = document.getElementById('mode-1-radio');
    const mode2Radio = document.getElementById('mode-2-radio');
    const mode1Container = document.getElementById('mode-1-container');
    const mode2Container = document.getElementById('mode-2-container');

    mode1Radio.addEventListener('change', () => {
        if (mode1Radio.checked) {
            mode1Container.style.display = 'block';
            mode2Container.style.display = 'none';
        }
    });

    mode2Radio.addEventListener('change', () => {
        if (mode2Radio.checked) {
            mode1Container.style.display = 'none';
            mode2Container.style.display = 'block';
        }
    });
    
    // 确保初始状态正确
    mode1Container.style.display = 'block';
    mode2Container.style.display = 'none';


    // --- 3. 初始化所有模式中的共用 UI 逻辑 ---
    
    // 模式一：
    setupFlowModeToggle("input[name='flow_mode']", 'rpm-inputs-m1', 'vol-inputs-m1', 'displacement', 'flow_m3h');
    setupMode1PowerToggle();
    setupMode1CapacityToggle();

    // 模式二：
    setupFlowModeToggle("input[name='flow_mode_m2']", 'rpm-inputs-m2', 'vol-inputs-m2', 'displacement_m2', 'flow_m3h_m2');
    setupMode2EffToggle();
    setupMode2CoolerToggle();

    // (v4.0) 模式三 (容积式):
    setupFlowModeToggle("input[name='flow_mode_m3']", 'rpm-inputs-m3', 'vol-inputs-m3', 'displacement_m3', 'flow_m3');
    setupMode3PTToggle('inlet_mode_m3', 'inlet-temp-m3', 'inlet-press-m3', 'temp_evap_m3', 'press_evap_m3');
    setupMode3PTToggle('outlet_mode_m3', 'outlet-temp-m3', 'outlet-press-m3', 'temp_cond_m3', 'press_cond_m3');
    
    // (v4.1) 模式四 (透平式):
    setupMode4FlowToggle(); // (v4.1) 新增
    setupMode3PTToggle('inlet_mode_m4', 'inlet-temp-m4', 'inlet-press-m4', 'temp_evap_m4', 'press_evap_m4');
    setupMode3PTToggle('outlet_mode_m4', 'outlet-temp-m4', 'outlet-press-m4', 'temp_cond_m4', 'press_cond_m4');
    
    console.log("UI 模块 (v4.1) 已初始化。");
}