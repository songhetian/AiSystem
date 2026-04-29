import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedApprovalSystem() {
  console.log('开始初始化审批系统数据...');

  try {
    // 1. 创建默认费用类型
    const expenseTypes = [
      {
        id: 'exp_travel',
        name: '差旅费',
        code: 'TRAVEL',
        description: '出差相关费用报销，包括交通费、住宿费等',
        platform_id: 'default',
        status: 1,
      },
      {
        id: 'exp_meal',
        name: '餐费',
        code: 'MEAL',
        description: '工作餐费报销，包括加班餐费、客户招待费等',
        platform_id: 'default',
        status: 1,
      },
      {
        id: 'exp_transport',
        name: '交通费',
        code: 'TRANSPORT',
        description: '日常交通费用报销，包括打车费、公交地铁费等',
        platform_id: 'default',
        status: 1,
      },
      {
        id: 'exp_office',
        name: '办公用品',
        code: 'OFFICE',
        description: '办公用品采购费用，包括文具、设备等',
        platform_id: 'default',
        status: 1,
      },
      {
        id: 'exp_training',
        name: '培训费',
        code: 'TRAINING',
        description: '员工培训相关费用，包括培训费、资料费等',
        platform_id: 'default',
        status: 1,
      },
      {
        id: 'exp_communication',
        name: '通讯费',
        code: 'COMMUNICATION',
        description: '通讯费用报销，包括电话费、网络费等',
        platform_id: 'default',
        status: 1,
      },
    ];

    for (const expenseType of expenseTypes) {
      await prisma.fin_expense_type.upsert({
        where: { id: expenseType.id },
        update: expenseType,
        create: expenseType,
      });
    }

    console.log('✅ 费用类型初始化完成');

    // 2. 创建默认审批模板
    const approvalTemplates = [
      {
        id: 'tpl_reimbursement',
        name: '报销申请模板',
        type: 'reimbursement',
        platform_id: 'default',
        platform_name: '默认平台',
        dept_id: null,
        department_name: '全部门',
        status: 'enabled',
        description: '用于员工日常费用报销申请',
        updated_at: new Date().toISOString(),
        nodes: {
          startNode: {
            id: 'start',
            name: '开始',
            type: 'start',
            next: 'dept_manager'
          },
          nodes: [
            {
              id: 'dept_manager',
              name: '部门经理审批',
              type: 'approval',
              approvers: {
                type: 'role',
                roles: ['dept_manager']
              },
              conditions: {
                amount_limit: 1000
              },
              next: {
                approved: 'finance',
                rejected: 'end'
              }
            },
            {
              id: 'finance',
              name: '财务审批',
              type: 'approval',
              approvers: {
                type: 'role',
                roles: ['finance']
              },
              next: {
                approved: 'end',
                rejected: 'end'
              }
            }
          ],
          endNode: {
            id: 'end',
            name: '结束',
            type: 'end'
          }
        },
        form_fields: {
          fields: [
            {
              id: 'expense_type',
              name: 'expense_type_id',
              label: '费用类型',
              type: 'select',
              required: true,
              options: {
                source: 'expense_types'
              }
            },
            {
              id: 'amount',
              name: 'amount',
              label: '报销金额',
              type: 'number',
              required: true,
              validation: {
                min: 0.01,
                max: 50000
              }
            },
            {
              id: 'description',
              name: 'description',
              label: '费用说明',
              type: 'textarea',
              required: true
            },
            {
              id: 'receipts',
              name: 'receipts',
              label: '发票附件',
              type: 'file',
              required: true,
              validation: {
                accept: '.jpg,.jpeg,.png,.pdf',
                maxSize: '10MB'
              }
            }
          ]
        },
        workflow_config: {
          timeout: 72, // 72小时超时
          auto_approve: false,
          notification: true
        }
      },
      {
        id: 'tpl_purchase',
        name: '采购申请模板',
        type: 'purchase',
        platform_id: 'default',
        platform_name: '默认平台',
        dept_id: null,
        department_name: '全部门',
        status: 'enabled',
        description: '用于部门物品采购申请',
        updated_at: new Date().toISOString(),
        nodes: {
          startNode: {
            id: 'start',
            name: '开始',
            type: 'start',
            next: 'dept_manager'
          },
          nodes: [
            {
              id: 'dept_manager',
              name: '部门经理审批',
              type: 'approval',
              approvers: {
                type: 'role',
                roles: ['dept_manager']
              },
              conditions: {
                amount_limit: 5000
              },
              next: {
                approved: 'general_manager',
                rejected: 'end'
              }
            },
            {
              id: 'general_manager',
              name: '总经理审批',
              type: 'approval',
              approvers: {
                type: 'role',
                roles: ['general_manager']
              },
              conditions: {
                amount_min: 5000
              },
              next: {
                approved: 'end',
                rejected: 'end'
              }
            }
          ],
          endNode: {
            id: 'end',
            name: '结束',
            type: 'end'
          }
        },
        form_fields: {
          fields: [
            {
              id: 'item_name',
              name: 'item_name',
              label: '物品名称',
              type: 'text',
              required: true
            },
            {
              id: 'quantity',
              name: 'quantity',
              label: '数量',
              type: 'number',
              required: true,
              validation: {
                min: 1
              }
            },
            {
              id: 'unit_price',
              name: 'unit_price',
              label: '单价',
              type: 'number',
              required: true,
              validation: {
                min: 0.01
              }
            },
            {
              id: 'total_amount',
              name: 'total_amount',
              label: '总金额',
              type: 'number',
              required: true,
              readonly: true,
              computed: 'quantity * unit_price'
            },
            {
              id: 'reason',
              name: 'reason',
              label: '采购原因',
              type: 'textarea',
              required: true
            }
          ]
        },
        workflow_config: {
          timeout: 96, // 96小时超时
          auto_approve: false,
          notification: true
        }
      },
      {
        id: 'tpl_leave',
        name: '请假申请模板',
        type: 'leave',
        platform_id: 'default',
        platform_name: '默认平台',
        dept_id: null,
        department_name: '全部门',
        status: 'enabled',
        description: '用于员工请假申请',
        updated_at: new Date().toISOString(),
        nodes: {
          startNode: {
            id: 'start',
            name: '开始',
            type: 'start',
            next: 'dept_manager'
          },
          nodes: [
            {
              id: 'dept_manager',
              name: '部门经理审批',
              type: 'approval',
              approvers: {
                type: 'role',
                roles: ['dept_manager']
              },
              next: {
                approved: 'end',
                rejected: 'end'
              }
            }
          ],
          endNode: {
            id: 'end',
            name: '结束',
            type: 'end'
          }
        },
        form_fields: {
          fields: [
            {
              id: 'leave_type',
              name: 'leave_type',
              label: '请假类型',
              type: 'select',
              required: true,
              options: {
                values: [
                  { value: 'annual', label: '年假' },
                  { value: 'sick', label: '病假' },
                  { value: 'personal', label: '事假' },
                  { value: 'maternity', label: '产假' },
                  { value: 'paternity', label: '陪产假' }
                ]
              }
            },
            {
              id: 'start_time',
              name: 'start_time',
              label: '开始时间',
              type: 'datetime',
              required: true
            },
            {
              id: 'end_time',
              name: 'end_time',
              label: '结束时间',
              type: 'datetime',
              required: true
            },
            {
              id: 'duration_hours',
              name: 'duration_hours',
              label: '请假时长(小时)',
              type: 'number',
              required: true,
              readonly: true,
              computed: '(end_time - start_time) / 3600000'
            },
            {
              id: 'reason',
              name: 'reason',
              label: '请假原因',
              type: 'textarea',
              required: true
            }
          ]
        },
        workflow_config: {
          timeout: 48, // 48小时超时
          auto_approve: false,
          notification: true
        }
      }
    ];

    for (const template of approvalTemplates) {
      await prisma.approval_template.upsert({
        where: { id: template.id },
        update: template,
        create: template,
      });
    }

    console.log('✅ 审批模板初始化完成');

    // 3. 创建系统配置
    const systemConfigs = [
      {
        id: 'cfg_approval_enabled',
        config_key: 'approval.system.enabled',
        config_value: 'true',
        remark: '审批系统功能开关'
      },
      {
        id: 'cfg_approval_auto_financial',
        config_key: 'approval.auto.financial.record',
        config_value: 'true',
        remark: '自动创建财务记录开关'
      },
      {
        id: 'cfg_approval_notification',
        config_key: 'approval.notification.enabled',
        config_value: 'true',
        remark: '审批通知功能开关'
      },
      {
        id: 'cfg_approval_timeout',
        config_key: 'approval.default.timeout.hours',
        config_value: '72',
        remark: '默认审批超时时间（小时）'
      },
      {
        id: 'cfg_approval_types',
        config_key: 'approval.template.types',
        config_value: JSON.stringify(['reimbursement', 'purchase', 'leave', 'business_trip', 'general']),
        remark: '审批模板类型配置'
      },
      {
        id: 'cfg_approval_status',
        config_key: 'approval.instance.status',
        config_value: JSON.stringify(['pending', 'approved', 'rejected', 'cancelled']),
        remark: '审批实例状态配置'
      },
      {
        id: 'cfg_approval_actions',
        config_key: 'approval.record.actions',
        config_value: JSON.stringify(['approve', 'reject', 'transfer']),
        remark: '审批操作类型配置'
      }
    ];

    for (const config of systemConfigs) {
      await prisma.sys_config.upsert({
        where: { config_key: config.config_key },
        update: {
          config_value: config.config_value,
          remark: config.remark
        },
        create: config,
      });
    }

    console.log('✅ 系统配置初始化完成');

    // 4. 创建示例审批实例（用于测试）
    const sampleInstances = [
      {
        id: 'inst_sample_001',
        template_id: 'tpl_reimbursement',
        applicant_id: 'user_sample', // 需要确保用户存在
        title: '差旅费报销申请 - 北京出差',
        form_data: {
          expense_type_id: 'exp_travel',
          amount: 1500.00,
          description: '北京出差3天，包含高铁票、住宿费和餐费',
          receipts: [
            {
              name: '高铁票.jpg',
              url: '/uploads/receipts/train_ticket.jpg',
              size: 245760
            },
            {
              name: '酒店发票.pdf',
              url: '/uploads/receipts/hotel_invoice.pdf',
              size: 512000
            }
          ]
        },
        current_node_id: 'dept_manager',
        status: 'pending',
        priority: 1,
        platform_id: 'default',
        department_id: 'dept_sample'
      }
    ];

    // 注意：只有在确保相关用户和部门存在时才创建示例数据
    // 这里先跳过示例实例的创建，避免外键约束错误

    console.log('✅ 审批系统数据初始化完成');

    // 5. 输出初始化结果
    const expenseTypeCount = await prisma.fin_expense_type.count();
    const templateCount = await prisma.approval_template.count();
    const configCount = await prisma.sys_config.count({
      where: {
        config_key: {
          startsWith: 'approval.'
        }
      }
    });

    console.log('\n📊 初始化统计:');
    console.log(`   费用类型: ${expenseTypeCount} 个`);
    console.log(`   审批模板: ${templateCount} 个`);
    console.log(`   系统配置: ${configCount} 个`);
    console.log('\n🎉 审批系统初始化成功！');

  } catch (error) {
    console.error('❌ 审批系统初始化失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  seedApprovalSystem()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedApprovalSystem };
