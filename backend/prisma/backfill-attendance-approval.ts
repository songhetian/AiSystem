import { PrismaClient } from '@prisma/client';

type AttendanceBizType = 'attendance_leave' | 'attendance_overtime' | 'attendance_patch_card';

interface ApprovalRequestRow {
  id: string;
  request_no: string;
  type: string | null;
  summary: string | null;
  biz_type: string | null;
  biz_id: string | null;
}

interface AttendanceRecordRow {
  id: string;
  approval_request_id: string | null;
  approval_request_no: string | null;
}

const prisma = new PrismaClient();

const BIZ_TABLES: Record<AttendanceBizType, string> = {
  attendance_leave: 'attendance_leave',
  attendance_overtime: 'attendance_overtime',
  attendance_patch_card: 'attendance_patch_card'
};

const TAG_PATTERN = /^\[biz:(attendance_leave|attendance_overtime|attendance_patch_card):([^\]]+)\]/;

function resolveBiz(request: ApprovalRequestRow) {
  if (request.biz_type && request.biz_id && request.biz_type in BIZ_TABLES) {
    return {
      bizType: request.biz_type as AttendanceBizType,
      bizId: request.biz_id
    };
  }

  if (!request.summary) {
    return undefined;
  }

  const match = request.summary.match(TAG_PATTERN);
  if (!match) {
    return undefined;
  }

  return {
    bizType: match[1] as AttendanceBizType,
    bizId: match[2]
  };
}

async function findAttendanceRecord(bizType: AttendanceBizType, bizId: string) {
  const table = BIZ_TABLES[bizType];
  const rows = await prisma.$queryRawUnsafe<AttendanceRecordRow[]>(
    `SELECT id, approval_request_id, approval_request_no FROM ${table} WHERE id = ? AND is_deleted = 0 LIMIT 1`,
    bizId
  );

  return rows[0];
}

async function updateApprovalRequestBiz(requestId: string, bizType: AttendanceBizType, bizId: string) {
  await prisma.$executeRawUnsafe(
    'UPDATE approval_request SET biz_type = ?, biz_id = ?, update_time = NOW() WHERE id = ?',
    bizType,
    bizId,
    requestId
  );
}

async function updateAttendanceLink(table: string, bizId: string, requestId: string, requestNo: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE ${table} SET approval_request_id = ?, approval_request_no = ?, update_time = NOW() WHERE id = ?`,
    requestId,
    requestNo,
    bizId
  );
}

async function main() {
  const requests = await prisma.$queryRawUnsafe<ApprovalRequestRow[]>(
    `
      SELECT id, request_no, type, summary, biz_type, biz_id
      FROM approval_request
      WHERE is_deleted = 0
        AND (
          biz_type IN ('attendance_leave', 'attendance_overtime', 'attendance_patch_card')
          OR type IN ('attendance_leave', 'attendance_overtime', 'attendance_patch_card')
          OR summary LIKE '[biz:attendance_%'
        )
      ORDER BY create_time ASC
    `
  );

  let requestBizUpdated = 0;
  let attendanceLinkUpdated = 0;
  let skipped = 0;

  for (const request of requests) {
    const biz = resolveBiz(request);
    if (!biz) {
      skipped += 1;
      console.warn(`[skip] request ${request.id} missing attendance biz marker`);
      continue;
    }

    if (request.biz_type !== biz.bizType || request.biz_id !== biz.bizId) {
      await updateApprovalRequestBiz(request.id, biz.bizType, biz.bizId);
      requestBizUpdated += 1;
    }

    const table = BIZ_TABLES[biz.bizType];
    const attendance = await findAttendanceRecord(biz.bizType, biz.bizId);
    if (!attendance) {
      skipped += 1;
      console.warn(`[skip] request ${request.id} -> ${biz.bizType}/${biz.bizId} not found`);
      continue;
    }

    if (
      attendance.approval_request_id &&
      attendance.approval_request_no &&
      attendance.approval_request_id !== request.id
    ) {
      skipped += 1;
      console.warn(
        `[skip] ${table}/${biz.bizId} already linked to another approval ${attendance.approval_request_id}`
      );
      continue;
    }

    if (attendance.approval_request_id !== request.id || attendance.approval_request_no !== request.request_no) {
      await updateAttendanceLink(table, biz.bizId, request.id, request.request_no);
      attendanceLinkUpdated += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        scanned: requests.length,
        requestBizUpdated,
        attendanceLinkUpdated,
        skipped
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
