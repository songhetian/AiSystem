import { PartialType } from '@nestjs/swagger';
import { CreateApprovalProcessDto } from './create-approval-process.dto';

export class UpdateApprovalProcessDto extends PartialType(CreateApprovalProcessDto) {}
