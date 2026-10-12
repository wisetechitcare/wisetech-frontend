import type { CourtesyDeskState, CourtesyDrive, PeopleGroup } from '../types';
import { DEFAULT_OCCASIONS, DEFAULT_STATUS_COLORS } from '../types';

export function seedCourtesyDeskState(): CourtesyDeskState {
  const now = new Date();
  const iso = now.toISOString();
  const date = iso.slice(0, 10);

  const rezaGroup: PeopleGroup = {
    id: 'grp_demo_reza',
    name: 'Reza Peoples',
    notes: 'Partners & seniors at Reza Kabul Architects',
    status: 'ACTIVE',
    createdAt: iso,
    updatedAt: iso,
    members: [
      {
        memberType: 'CONTACT',
        personId: 'demo_c_1',
        fullName: 'Reza Kabul',
        companyName: 'Reza Kabul Architects',
        area: 'Bandra',
        address: 'Bandra West, Mumbai',
        phone: '9876543210',
      },
      {
        memberType: 'CONTACT',
        personId: 'demo_c_2',
        fullName: 'Aabsar Borkar',
        companyName: 'Reza Kabul Architects',
        area: 'Bandra',
        address: 'Bandra West, Mumbai',
        phone: '9876543211',
      },
      {
        memberType: 'CONTACT',
        personId: 'demo_c_3',
        fullName: 'Zafar Iqbal',
        companyName: 'Reza Kabul Architects',
        area: 'Bandra',
        address: 'Bandra West, Mumbai',
      },
      {
        memberType: 'CONTACT',
        personId: 'demo_c_4',
        fullName: 'Mangesh Rane',
        companyName: 'Reza Kabul Architects',
        area: 'Andheri',
        address: 'Andheri East, Mumbai',
      },
    ],
  };

  const bandraGroup: PeopleGroup = {
    id: 'grp_demo_bandra',
    name: 'Bandra Clients',
    notes: 'Area-based list for in-person routes',
    status: 'ACTIVE',
    createdAt: iso,
    updatedAt: iso,
    members: [
      {
        memberType: 'CONTACT',
        personId: 'demo_c_5',
        fullName: 'Sunil Datwani',
        companyName: 'Gehna',
        area: 'Bandra',
        address: 'Bandra, Mumbai',
      },
      {
        memberType: 'CONTACT',
        personId: 'demo_c_1',
        fullName: 'Reza Kabul',
        companyName: 'Reza Kabul Architects',
        area: 'Bandra',
        address: 'Bandra West, Mumbai',
      },
    ],
  };

  const staffGroup: PeopleGroup = {
    id: 'grp_demo_staff',
    name: 'All Staff – Welcome pool',
    notes: 'Internal employees for welcome kits / festival sweets',
    status: 'ACTIVE',
    createdAt: iso,
    updatedAt: iso,
    members: [
      {
        memberType: 'EMPLOYEE',
        personId: 'demo_e_1',
        fullName: 'Mustafa Khan',
        companyName: 'Wisetech',
        area: 'Office',
      },
      {
        memberType: 'EMPLOYEE',
        personId: 'demo_e_2',
        fullName: 'Aabid',
        companyName: 'Wisetech',
        area: 'Office',
      },
      {
        memberType: 'EMPLOYEE',
        personId: 'demo_e_3',
        fullName: 'Akram',
        companyName: 'Wisetech',
        area: 'Office',
      },
    ],
  };

  const perfumeDrive: CourtesyDrive = {
    id: 'drv_demo_perfume',
    title: 'Perfume for Reza Peoples',
    occasionType: 'CLIENT_GIFT',
    giftItem: 'Perfume',
    driveDate: date,
    sourceGroupId: rezaGroup.id,
    sourceGroupName: rezaGroup.name,
    status: 'IN_PROGRESS',
    defaultMode: 'IN_PERSON',
    defaultAssigneeEmployeeId: 'demo_e_assignee',
    defaultAssigneeName: 'Mobeen',
    createdAt: iso,
    updatedAt: iso,
    recipients: rezaGroup.members.map((m, i) => ({
      id: `rcp_demo_${i + 1}`,
      memberType: m.memberType,
      personId: m.personId,
      fullName: m.fullName,
      companyName: m.companyName,
      area: m.area,
      address: m.address,
      phone: m.phone,
      status: i === 0 ? 'DELIVERED' : i === 1 ? 'OUT' : 'PENDING',
      mode: 'IN_PERSON',
      quantity: 1,
      assigneeEmployeeId: 'demo_e_assignee',
      assigneeName: 'Mobeen',
      remark: i === 0 ? 'Handed at office' : '',
      skippedReason: '',
      updatedAt: iso,
    })),
  };

  return {
    version: 2,
    config: {
      occasions: DEFAULT_OCCASIONS.map((o) => ({ ...o })),
      statusColors: { ...DEFAULT_STATUS_COLORS },
    },
    groups: [rezaGroup, bandraGroup, staffGroup],
    drives: [perfumeDrive],
  };
}
