// =====================================================================
// main.js: 主应用程序入口
// 版本: v4.4 (MVR 拆分) - 最终修复版
// 职责: 1. 加载 CoolProp 物性库
//        2. 加载成功后, 初始化所有 UI 和计算模块 (1, 2, 3, 4)
// =====================================================================

import { loadCoolProp, updateFluidInfo } from './coolprop_loader.js';
import { initUI } from './ui.js';

// ======================= (v4.4 最终修复) =======================
//
// 使用了您刚刚上传的正确文件名 'mode1_eval.js' 和 'mode2_predict.js'
//
// ===============================================================

import { initMode1 } from './mode1_eval.js'; 
import { initMode2 } from './mode2_predict.js';

// (v4.0) 导入模式 3 和 4
import { initMode3 } from './mode3_mvr.js';
import { initMode4 } from './mode4_turbo.js';

// 应用程序启动
document.addEventListener('DOMContentLoaded', () => {

    // (v4.0) 定义所有模式的按钮和信息框
    const modes = [
        {
            btnId: 'calc-button-mode-1',
            btnText: '计算性能 (模式一)',
            fluidSelId: 'fluid',
            fluidInfoId: 'fluid-info'
        },
        {
            btnId: 'calc-button-mode-2',
            btnText: '预测性能 (模式二)',
            fluidSelId: 'fluid_m2',
            fluidInfoId: 'fluid-info-m2'
        },
        {
            btnId: 'calc-button-mode-3',
            btnText: '计算喷水量 (模式三)',
            fluidSelId: 'fluid_m3',
            fluidInfoId: 'fluid-info-m3'
        },
        {
            btnId: 'calc-button-mode-4',
            btnText: '计算喷水量 (模式四)',
            fluidSelId: 'fluid_m4',
            fluidInfoId: 'fluid-info-m4'
        }
    ];

    const allButtons = modes.map(m => document.getElementById(m.btnId)).filter(Boolean);
    const allFluidItems = modes.map(m => ({
        sel: document.getElementById(m.fluidSelId),
        info: document.getElementById(m.fluidInfoId)
    })).filter(item => item.sel && item.info);

    // 1. 异步加载 CoolProp
    loadCoolProp()
        .then(CP => {
            // 2. 加载成功
            console.log("CoolProp v" + CP.get_global_param_string("version") + " loaded.");
            
            // 3. 初始化所有模块
            initUI();     // 初始化 Tab 和表单切换
            
            // (v4.4) 修复: 现在 initMode1 和 initMode2 应该是
            // 成功导入的函数, 将被正确调用。
            if (typeof initMode1 === 'function') {
                initMode1(CP);
                console.log("模式一 (mode1_eval.js) 已初始化。");
            } else {
                console.error("initMode1 不是一个函数。请检查 'mode1_eval.js' 的 import 和 export。");
            }
            
            if (typeof initMode2 === 'function') {
                initMode2(CP);
                console.log("模式二 (mode2_predict.js) 已初始化。");
            } else {
                console.error("initMode2 不是一个函数。请检查 'mode2_predict.js' 的 import 和 export。");
            }
            
            if (typeof initMode3 === 'function') initMode3(CP);
            if (typeof initMode4 === 'function') initMode4(CP);

            // 4. 激活所有计算按钮并更新物性信息
            modes.forEach(mode => {
                const btn = document.getElementById(mode.btnId);
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = mode.btnText;
                }
                const sel = document.getElementById(mode.fluidSelId);
                const info = document.getElementById(mode.fluidInfoId);
                if (sel && info) {
                    updateFluidInfo(sel, info, CP);
                }
            });

        })
        .catch(err => {
            // 5. 加载失败
            console.error("Failed to load CoolProp or init modules:", err);
            
            let errorMsg = "加载失败: " + err.message;
            if (err.message.includes('Failed to fetch dynamically imported module')) {
                errorMsg = "加载失败: 无法找到 JS 模块。请检查 main.js 中 import 的文件名是否正确?";
            }

            allButtons.forEach(btn => {
                if (btn) {
                    btn.textContent = "加载失败";
                    btn.disabled = true;
                }
            });
            allFluidItems.forEach(item => {
                if (item.info) {
                    item.info.textContent = errorMsg;
                }
            });
        });
});