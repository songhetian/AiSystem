/**
 * 排班管理页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Layout, Space, Typography, message, Card } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarOutlined,
  SettingOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar } from '@/components/business';
import { Modal, Button } from '@/components/ui';
import { attendanceApi } from '@/api/attendance';
import type { AttendanceScheduleShift } from '@/api/attendance/types';
import { personnelApi } from '@/api/personnel';
import { systemApi } from '@/api/system';
import { useGlobalStore } from '@/models/global';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ScheduleFilterBar } from './components/ScheduleFilterBar';
import { ScheduleTable } from './components/ScheduleTable';
import { DraggableShiftCard } from './components/DraggableShiftCard';
import { useScheduleDnD } from './hooks/useScheduleDnD';
import { ScheduleSettingsDrawer } from './components/ScheduleSettingsDrawer';
import { formatDate } from '@/utils/format';

const { Text, Title } = Typography;

/**
 * 构建月份范围
 */
function buildMonthRange(month: Dayjs) {
  return {
    start_date: month.startOf('month').format('YYYY-MM-DD'),
    end_date: month.endOf('month').format('YYYY-MM-DD'),
  };
}

const ScheduleManagementPage: React.FC = () => {
  const currentUser = useGlobalStore((state) => state.currentUser);

  // 状态管理
  const [month, setMonth] = useState(dayjs());
  const [filters, setFilters] = useState<any>({});
  const [scheduleMode, setScheduleMode] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  // 防抖搜索
  const debouncedEmployeeKeyword = useDebounce(filters.employeeKeyword, 500);

  // 拖拽功能
  const {
    activeShift,
    previewTarget,
    onDragStart,
    onDragOver,
    onDragEnd,
    saving,
    saveSchedule,
  } = useScheduleDnD();

  const sensors = useSensors(useSensor(PointerSensor));
  const dateRange = buildMonthRange(month);

  // 快捷键支持
  useKeyboardShortcuts({
    'Ctrl+r': () => refetch(),
    'Ctrl+s': () => setScheduleMode(!scheduleMode),
    Escape: () => {
      setScheduleMode(false);
      setSelectedShiftId(undefined);
      setSettingsDrawerOpen(false);
    },
  });

  // 查询排班数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'attendance-schedules',
      month.format('YYYY-MM'),
      filters.deptId,
      debouncedEmployeeKeyword,
    ],
    queryFn: () =>
      attendanceApi.getDashboard({
        ...dateRange,
        ...(filters.deptId ? { dept_id: filters.deptId } : {}),
        ...(debouncedEmployeeKeyword
          ? { keyword: debouncedEmployeeKeyword }
          : {}),
      }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 查询部门列表
  const { data: departments = [] } = useQuery({
    queryKey: ['system-departments'],
    queryFn: systemApi.listDepartments,
    staleTime: 5 * 60 * 1000,
  });

  // 查询员工列表
  const { data: employees = [] } = useQuery({
    queryKey: ['personnel-employees'],
    queryFn: personnelApi.listEmployees,
    staleTime: 5 * 60 * 1000,
  });

  // 计算选中的班次
  const selectedShift = useMemo(
    () => data?.shifts?.find((item) => item.id === selectedShiftId) ?? null,
    [data?.shifts, selectedShiftId],
  );

  // 部门选项
  const departmentOptions = useMemo(
    () =>
      departments.map((item: { id: string; name: string }) => ({
        label: item.name,
        value: item.id,
      })),
    [departments],
  );

  // 员工选项
  const employeeOptions = useMemo(
    () =>
      employees
        .filter((item: { department_id?: string }) =>
          !filters.deptId ? true : item.department_id === filters.deptId,
        )
        .map((item: { name: string; employee_no?: string }) => ({
          label: `${item.name}${item.employee_no ? ` / ${item.employee_no}` : ''}`,
          value: item.employee_no || item.name,
        })),
    [filters.deptId, employees],
  );

  // 权限范围标签
  const scopeLabel = currentUser?.name
    ? `当前查看：${currentUser.name} 可见范围内排班`
    : '当前查看：权限范围内排班';

  // 月份切换
  const handleMonthChange = (value: Dayjs) => {
    setMonth(value);
  };

  // 筛选处理
  const handleSearch = (values: any) => {
    setFilters(values);
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({});
  };

  // 切换排班模式
  const handleToggleScheduleMode = () => {
    setScheduleMode((current) => {
      if (current) setSelectedShiftId(undefined);
      return !current;
    });
  };

  // 刷新数据
  const handleRefresh = () => {
    refetch();
    message.success('数据已刷新');
  };

  const handleAssign = async ({
    employee_id,
    schedule_date,
    shift_name,
  }: {
    employee_id: string;
    schedule_date: string;
    shift_name?: string | null;
  }) => {
    if (!scheduleMode) return;
    if (!selectedShift) {
      message.warning("请先在左侧激活一个班次");
      return;
    }

    if (shift_name && shift_name !== selectedShift.name) {
      Modal.confirm({
        title: "确认覆盖排班",
        content: `该日期已排为“${shift_name}”，是否改为“${selectedShift.name}”？`,
        okText: "确认覆盖",
        cancelText: "取消",
        onOk: async () => {
          await saveSchedule({
            shift_id: selectedShift.id,
            items: [{ employee_id, schedule_date }],
          });
        },
      });
      return;
    }

    await saveSchedule({
      shift_id: selectedShift.id,
      items: [{ employee_id, schedule_date }],
    });
  };

  const handleClear = async ({
    employee_id,
    schedule_date,
    shift_name,
  }: {
    employee_id: string;
    schedule_date: string;
    shift_name?: string | null;
  }) => {
    if (!scheduleMode || !shift_name) return;
    Modal.confirm({
      title: "确认清空排班",
      content: `是否清空 ${schedule_date} 的“${shift_name}”排班？`,
      okText: "清空",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await saveSchedule({
          items: [{ employee_id, schedule_date }],
        });
      },
    });
  };

  return (
    <PageContainer
      title="排班管理"
      subTitle="智能排班系统，支持拖拽操作和批量排班"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '考勤管理' },
          { title: '排班管理' },
        ],
      }}
    >
      {/* 筛选区域 */}
      <SectionCard title="筛选条件" collapsible defaultCollapsed={false}>
        <FilterBar
          items={[
            {
              name: 'month',
              label: '月份',
              type: 'custom',
              render: () => (
                <Space.Compact>
                  <Button
                    icon={<LeftOutlined />}
                    onClick={() => setMonth((current) => current.subtract(1, 'month'))}
                  />
                  <DatePicker
                    picker="month"
                    value={month}
                    onChange={(value) => value && handleMonthChange(value)}
                    format="YYYY年MM月"
                    allowClear={false}
                  />
                  <Button
                    icon={<RightOutlined />}
                    onClick={() => setMonth((current) => current.add(1, 'month'))}
                  />
                </Space.Compact>
              ),
            },
            {
              name: 'deptId',
              label: '部门',
              type: 'select',
              placeholder: '请选择部门',
              options: [
                { label: '全部部门', value: undefined },
                ...departmentOptions,
              ],
            },
            {
              name: 'employeeKeyword',
              label: '员工',
              type: 'input',
              placeholder: '请输入员工姓名或工号',
            },
          ]}
          glass
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </SectionCard>

      {/* 操作区域 */}
      <SectionCard>
        <ActionBar
          actions={[
            {
              key: 'toggle-mode',
              label: scheduleMode ? '退出排班模式' : '进入排班模式',
              icon: <CalendarOutlined />,
              type: scheduleMode ? 'default' : 'primary',
              onClick: handleToggleScheduleMode,
            },
            {
              key: 'refresh',
              label: '刷新数据',
              icon: <ReloadOutlined />,
              onClick: handleRefresh,
            },
            {
              key: 'ai-schedule',
              label: 'AI智能排班',
              icon: <RobotOutlined />,
              onClick: () => setAiModalOpen(true),
            },
            {
              key: 'settings',
              label: '排班设置',
              icon: <SettingOutlined />,
              onClick: () => setSettingsDrawerOpen(true),
            },
          ]}
          extra={
            <Space>
              <Text type="secondary">{scopeLabel}</Text>
              {scheduleMode && selectedShift && (
                <Text type="success">
                  当前激活班次：{selectedShift.name}
                </Text>
              )}
              {saving && (
                <Text type="warning">保存中...</Text>
              )}
            </Space>
          }
          align="space-between"
          glass
        />

        {/* 排班看板 */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, marginTop: 16 }}>
          {/* 班次列表 */}
          <Card glass shadow="md">
            <div style={{ marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                班次列表
              </Title>
              <Text type="secondary">
                点击激活班次，拖拽或点击表格单元格即可排班
              </Text>
            </div>

            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {data?.shifts?.map((shift: AttendanceScheduleShift) => (
                <DraggableShiftCard
                  key={shift.id}
                  shift={shift}
                  selected={selectedShiftId === shift.id}
                  disabled={!scheduleMode}
                  onSelect={() => {
                    if (!scheduleMode) {
                      message.info('请先进入排班模式');
                      return;
                    }
                    setSelectedShiftId((current) =>
                      current === shift.id ? undefined : shift.id,
                    );
                  }}
                />
              ))}
            </Space>
          </Card>

          {/* 排班表格 */}
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={(event) => {
              void onDragEnd(event);
            }}
          >
            <Card glass shadow="md">
              <div style={{
                borderBottom: '1px solid #f0f0f0',
                padding: '16px 0',
                marginBottom: 16,
              }}>
                <Space direction="vertical" size={0}>
                  <Text strong>
                    {month.format('YYYY 年 MM 月排班看板')}
                  </Text>
                  <Text type="secondary">
                    {scheduleMode
                      ? selectedShift
                        ? `当前激活班次：${selectedShift.name}`
                        : '当前未激活班次，点击左侧班次后可快速排班'
                      : '当前为只读状态，进入排班模式后可编辑'}
                  </Text>
                </Space>
              </div>

              <ScheduleTable
                data={data}
                loading={isLoading}
                scheduleMode={scheduleMode}
                activeShift={(activeShift ?? selectedShift) as AttendanceScheduleShift | null}
                previewTarget={previewTarget}
                onCellClick={(payload) => {
                  void handleAssign(payload);
                }}
                onCellDoubleClick={(payload) => {
                  void handleClear(payload);
                }}
              />
            </Card>
          </DndContext>
        </div>
      </SectionCard>

      {/* AI排班弹窗 */}
      <Modal
        visible={aiModalOpen}
        title="AI智能排班"
        width={600}
        glass
        onCancel={() => setAiModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setAiModalOpen(false)}>
            取消
          </Button>,
          <Button key="ok" type="primary" onClick={() => setAiModalOpen(false)}>
            开始AI排班
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <RobotOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={4}>AI智能排班功能</Title>
          <Text type="secondary">
            基于员工技能、工作负荷和历史数据，智能生成最优排班方案
          </Text>
          <div style={{ marginTop: 24, textAlign: 'left' }}>
            <Text strong>功能特点：</Text>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>考虑员工技能匹配度</li>
              <li>平衡工作负荷分配</li>
              <li>遵循劳动法规要求</li>
              <li>优化人力成本</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* 排班设置抽屉 */}
      <ScheduleSettingsDrawer
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
      />
    </PageContainer>
  );
};

export default ScheduleManagementPage;
