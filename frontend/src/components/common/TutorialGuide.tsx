import { useState, useEffect } from "react";
import { Modal, Steps, Button, Space, Image, Checkbox } from "antd";
import {
  QuestionCircleOutlined,
  RightOutlined,
  LeftOutlined,
} from "@ant-design/icons";

interface TutorialStep {
  title: string;
  content: string;
  image?: string;
  tips?: string[];
}

interface TutorialGuideProps {
  tutorialKey: string;
  title: string;
  steps: TutorialStep[];
  autoShow?: boolean;
}

export const TutorialGuide = ({
  tutorialKey,
  title,
  steps,
  autoShow = true,
}: TutorialGuideProps) => {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // 检查是否已经看过教程
    const hasViewed = localStorage.getItem(`tutorial-viewed-${tutorialKey}`);
    if (!hasViewed && autoShow) {
      setVisible(true);
    }
  }, [tutorialKey, autoShow]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(`tutorial-viewed-${tutorialKey}`, "true");
    }
    setVisible(false);
    setCurrentStep(0);
    setDontShowAgain(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <>
      <Button
        type="text"
        icon={<QuestionCircleOutlined />}
        onClick={() => setVisible(true)}
      >
        操作指引
      </Button>

      <Modal
        open={visible}
        title={title}
        onCancel={handleClose}
        width={800}
        footer={
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Checkbox
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            >
              不再显示
            </Checkbox>
            <Space>
              <Button
                icon={<LeftOutlined />}
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                上一步
              </Button>
              <Button
                type="primary"
                icon={<RightOutlined />}
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? "完成" : "下一步"}
              </Button>
            </Space>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Steps current={currentStep} size="small">
            {steps.map((step, index) => (
              <Steps.Step key={index} title={step.title} />
            ))}
          </Steps>

          <div style={{ minHeight: 300 }}>
            <h3>{currentStepData.title}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.8 }}>
              {currentStepData.content}
            </p>

            {currentStepData.image && (
              <div style={{ textAlign: "center", margin: "20px 0" }}>
                <Image
                  src={currentStepData.image}
                  alt={currentStepData.title}
                  style={{ maxWidth: "100%" }}
                />
              </div>
            )}

            {currentStepData.tips && currentStepData.tips.length > 0 && (
              <div
                style={{
                  background: "#f0f2f5",
                  padding: 16,
                  borderRadius: 4,
                  marginTop: 16,
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                  💡 小提示：
                </div>
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  {currentStepData.tips.map((tip, index) => (
                    <li key={index} style={{ marginBottom: 4 }}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Space>
      </Modal>
    </>
  );
};

// 预定义的教程配置
export const TUTORIALS = {
  permissionDragAssign: {
    key: "permission-drag-assign",
    title: "双栏拖拽分配权限 - 操作指引",
    steps: [
      {
        title: "了解布局",
        content:
          '双栏拖拽界面分为左右两栏：左侧是"可分配权限"列表，显示该角色尚未拥有的权限；右侧是"已分配权限"列表，显示该角色已经拥有的权限。',
        tips: [
          "权限按模块分组显示，便于快速查找",
          "每个权限都有类型标签（菜单/按钮）",
          "可以通过搜索快速定位权限",
        ],
      },
      {
        title: "分配权限",
        content:
          '点击左侧"可分配权限"列表中的权限项，该权限会自动移动到右侧"已分配权限"列表中。也可以拖拽权限项到右侧列表。',
        tips: [
          "支持点击和拖拽两种方式",
          "可以一次选择多个权限进行批量分配",
          "新添加的权限会有绿色高亮标识（持续3秒）",
        ],
      },
      {
        title: "取消权限",
        content:
          '点击右侧"已分配权限"列表中的权限项，该权限会自动移回左侧"可分配权限"列表中。',
        tips: [
          "取消权限的操作与分配权限类似",
          "可以使用 Ctrl+Z 撤销上一步操作",
          "未保存的修改会有提示标识",
        ],
      },
      {
        title: "保存修改",
        content:
          '完成权限调整后，点击"保存"按钮（或按 Ctrl+S）保存修改。如果不想保存，可以点击"重置"按钮恢复到初始状态。',
        tips: [
          "保存前会显示修改的权限数量",
          "保存成功后会自动刷新权限列表",
          "支持快捷键 Ctrl+S 快速保存",
        ],
      },
      {
        title: "快捷键",
        content:
          "为了提高操作效率，系统提供了多个快捷键：Ctrl+S 保存、Ctrl+Z 撤销、Ctrl+Y 重做、Ctrl+F 搜索。",
        tips: [
          '点击右上角"快捷键"按钮查看完整快捷键列表',
          "快捷键可以大幅提升操作效率",
          "支持自定义快捷键配置",
        ],
      },
    ],
  },
  batchPermissionAssign: {
    key: "batch-permission-assign",
    title: "批量权限分配 - 操作指引",
    steps: [
      {
        title: "选择角色",
        content:
          "在角色列表中勾选需要批量操作的角色。可以使用全选功能快速选择所有角色。",
        tips: [
          "支持按部门筛选角色",
          "可以使用搜索功能快速定位角色",
          "已选角色数量会实时显示",
        ],
      },
      {
        title: "选择权限",
        content:
          "在权限列表中勾选需要分配的权限。可以按模块批量勾选，也可以单个勾选。",
        tips: [
          "支持按模块全选权限",
          "可以使用搜索功能快速定位权限",
          "已选权限数量会实时显示",
        ],
      },
      {
        title: "执行操作",
        content:
          '点击"批量分配"按钮将选中的权限分配给选中的角色。系统会弹出确认对话框，确认后执行操作。',
        tips: [
          "操作前会显示影响的角色和权限数量",
          "支持批量取消权限",
          "操作结果会有明确提示",
        ],
      },
      {
        title: "查看结果",
        content:
          "操作完成后，系统会显示操作结果，包括成功数量和失败原因（如果有）。可以在操作日志中查看详细记录。",
        tips: [
          "所有批量操作都会记录日志",
          "失败的操作会显示具体原因",
          "可以导出操作日志",
        ],
      },
    ],
  },
  permissionControl: {
    key: "permission-control",
    title: "权限控制配置 - 操作指引",
    steps: [
      {
        title: "全局开关",
        content:
          "全局权限控制开关位于页面右上角。开启后，所有功能默认需要权限控制；关闭后，所有用户拥有全部权限。",
        tips: [
          "切换开关需要二次确认",
          "开关状态会实时同步",
          "所有操作都会记录日志",
        ],
      },
      {
        title: "功能级配置",
        content:
          "可以针对每个模块、菜单、按钮单独设置是否需要权限控制。在列表中找到对应功能，切换开关即可。",
        tips: ["支持批量设置", "可以按资源类型筛选", "支持搜索功能"],
      },
      {
        title: "例外角色",
        content:
          "可以为某个功能设置例外角色。例外角色无需分配权限即可访问该功能。",
        tips: [
          "适用于超级管理员等特殊角色",
          "支持批量添加例外角色",
          "例外角色列表可以随时修改",
        ],
      },
      {
        title: "清理冗余配置",
        content:
          '系统会定期检测冗余的权限配置。点击"清理冗余配置"按钮可以手动触发检测和清理。',
        tips: [
          "系统每周自动执行一次清理",
          "清理前会显示检测结果",
          "清理操作不可撤销，请谨慎操作",
        ],
      },
    ],
  },
};
