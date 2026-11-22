/**
 * UWork 原型演示数据（客户端 / 管理端共用）
 * 所有业务对象都带密级字段 level，客户端按登录用户的密级过滤展示。
 * 修改这里的数据后，两个原型都会同步变化（通过 localStorage 持久化）。
 */
(function () {
  const levels = [
    { code: 'L1', name: '公开', rank: 1, color: '#1f8f4e', bg: '#e9f7ef', desc: '可对外公开的企业信息' },
    { code: 'L2', name: '内部', rank: 2, color: '#2f6fed', bg: '#eaf1fe', desc: '仅限公司内部员工使用' },
    { code: 'L3', name: '秘密', rank: 3, color: '#b87400', bg: '#fff4e0', desc: '秘密级及以上人员可访问' },
    { code: 'L4', name: '机密', rank: 4, color: '#d9480f', bg: '#fff0e8', desc: '机密级及以上人员可访问' },
    { code: 'L5', name: '绝密', rank: 5, color: '#c92a2a', bg: '#fdecec', desc: '仅绝密级人员可访问' }
  ];

  const seed = {
    meta: { version: 3, updatedAt: '2026-11-21 18:40', company: 'UWork 智能体' },
    levels,
    departments: [
      { id: 'dep1', name: '综合管理部', parent: null, leader: '赵琳', count: 12 },
      { id: 'dep2', name: '质量管理部', parent: null, leader: '张明', count: 9 },
      { id: 'dep3', name: '产品研发部', parent: null, leader: '李思', count: 36 },
      { id: 'dep31', name: '结构设计室', parent: 'dep3', leader: '陈浩', count: 8 },
      { id: 'dep32', name: '电子设计室', parent: 'dep3', leader: '周航', count: 10 },
      { id: 'dep33', name: '软件研发室', parent: 'dep3', leader: '吴桐', count: 12 },
      { id: 'dep4', name: '保密办公室', parent: null, leader: '王芳', count: 5 },
      { id: 'dep5', name: '生产制造部', parent: null, leader: '孙琦', count: 28 },
      { id: 'dep6', name: '信息技术部', parent: null, leader: '系统管理员', count: 7 },
      { id: 'dep7', name: '市场部', parent: null, leader: '刘洋', count: 11 }
    ],
    positions: [
      { id: 'p1', name: '质量工程师', dept: '质量管理部', level: 'L3', count: 4, status: '启用' },
      { id: 'p2', name: '体系工程师', dept: '质量管理部', level: 'L3', count: 3, status: '启用' },
      { id: 'p3', name: '保密专员', dept: '保密办公室', level: 'L4', count: 3, status: '启用' },
      { id: 'p4', name: '产品经理', dept: '产品研发部', level: 'L2', count: 6, status: '启用' },
      { id: 'p5', name: '结构工程师', dept: '结构设计室', level: 'L3', count: 8, status: '启用' },
      { id: 'p6', name: '软件工程师', dept: '软件研发室', level: 'L3', count: 12, status: '启用' },
      { id: 'p7', name: '行政专员', dept: '综合管理部', level: 'L1', count: 4, status: '启用' },
      { id: 'p8', name: '系统管理员', dept: '信息技术部', level: 'L5', count: 2, status: '启用' }
    ],
    roles: [
      { id: 'r1', name: '超级管理员', code: 'super_admin', scope: '全部数据', users: 1, level: 'L5', desc: '拥有管理端全部权限', status: '启用' },
      { id: 'r2', name: '知识库管理员', code: 'kb_admin', scope: '本部门及下级部门', users: 3, level: 'L4', desc: '管理知识库、文档模板与智能治理', status: '启用' },
      { id: 'r3', name: '部门管理员', code: 'dept_admin', scope: '本部门', users: 6, level: 'L3', desc: '管理本部门成员与部门知识库', status: '启用' },
      { id: 'r4', name: '普通员工', code: 'staff', scope: '本人', users: 78, level: 'L2', desc: '使用客户端智能体与已授权知识', status: '启用' },
      { id: 'r5', name: '审计员', code: 'auditor', scope: '只读全部', users: 2, level: 'L4', desc: '查看操作日志与治理记录', status: '启用' }
    ],
    users: [
      { id: 'u1', username: 'zhangming', name: '张明', dept: '质量管理部', role: '部门管理员', position: '质量工程师', level: 'L3', status: '启用', phone: '138 **** 2046', email: 'zhangming@uwork.cn', lastLogin: '2026-11-21 20:32' },
      { id: 'u2', username: 'lisi', name: '李思', dept: '产品研发部', role: '普通员工', position: '产品经理', level: 'L2', status: '启用', phone: '139 **** 8812', email: 'lisi@uwork.cn', lastLogin: '2026-11-21 18:07' },
      { id: 'u3', username: 'wangfang', name: '王芳', dept: '保密办公室', role: '知识库管理员', position: '保密专员', level: 'L4', status: '启用', phone: '137 **** 5521', email: 'wangfang@uwork.cn', lastLogin: '2026-11-21 17:45' },
      { id: 'u4', username: 'chenhao', name: '陈浩', dept: '产品研发部', role: '普通员工', position: '结构工程师', level: 'L3', status: '启用', phone: '136 **** 3390', email: 'chenhao@uwork.cn', lastLogin: '2026-11-20 09:28' },
      { id: 'u5', username: 'admin', name: '系统管理员', dept: '信息技术部', role: '超级管理员', position: '系统管理员', level: 'L5', status: '启用', phone: '135 **** 0001', email: 'admin@uwork.cn', lastLogin: '2026-11-21 20:58' },
      { id: 'u6', username: 'zhaolin', name: '赵琳', dept: '综合管理部', role: '普通员工', position: '行政专员', level: 'L1', status: '启用', phone: '138 **** 7712', email: 'zhaolin@uwork.cn', lastLogin: '2026-11-19 16:12' },
      { id: 'u7', username: 'sunqi', name: '孙琦', dept: '生产制造部', role: '普通员工', position: '工艺工程师', level: 'L2', status: '启用', phone: '139 **** 6603', email: 'sunqi@uwork.cn', lastLogin: '2026-11-21 08:40' },
      { id: 'u8', username: 'liuyang', name: '刘洋', dept: '市场部', role: '部门管理员', position: '市场经理', level: 'L2', status: '停用', phone: '136 **** 1128', email: 'liuyang@uwork.cn', lastLogin: '2026-10-30 14:02' }
    ],
    knowledgeBases: [
      {
        id: 'kb1', name: '质量体系知识库', desc: 'ISO 9001 / GJB 9001C 体系文件、内审外审记录与质量问题案例。',
        level: 'L3', owner: '张明', owners: ['u1'], dept: '质量管理部', updated: '2026-11-20', mine: true, canEdit: true,
        folders: [
          { id: 'kb1f1', name: '体系文件', parent: null },
          { id: 'kb1f11', name: 'ISO 9001:2015', parent: 'kb1f1' },
          { id: 'kb1f12', name: 'GJB 9001C-2017', parent: 'kb1f1' },
          { id: 'kb1f2', name: '内审与外审', parent: null },
          { id: 'kb1f3', name: '质量问题案例', parent: null }
        ],
        docs: [
          { id: 'kb1d1', name: '质量手册（2026 版）.pdf', folder: 'kb1f1', ext: 'pdf', size: '4.2 MB', level: 'L3', governed: true, owner: '张明', updated: '2026-11-18' },
          { id: 'kb1d2', name: '程序文件汇编.docx', folder: 'kb1f1', ext: 'docx', size: '2.8 MB', level: 'L3', governed: true, owner: '张明', updated: '2026-11-16' },
          { id: 'kb1d3', name: 'ISO 9001 内审检查表.xlsx', folder: 'kb1f11', ext: 'xlsx', size: '286 KB', level: 'L3', governed: false, owner: '张明', updated: '2026-11-20' },
          { id: 'kb1d4', name: 'GJB 9001C 标准条款对照表.xlsx', folder: 'kb1f12', ext: 'xlsx', size: '512 KB', level: 'L3', governed: true, owner: '王芳', updated: '2026-11-12' },
          { id: 'kb1d5', name: '2026 年度内审计划.pdf', folder: 'kb1f2', ext: 'pdf', size: '1.1 MB', level: 'L3', governed: true, owner: '张明', updated: '2026-11-08' },
          { id: 'kb1d6', name: '外审不符合项整改报告.docx', folder: 'kb1f2', ext: 'docx', size: '740 KB', level: 'L3', governed: false, owner: '李思', updated: '2026-11-05' },
          { id: 'kb1d7', name: '8D 质量问题分析报告-壳体裂纹.docx', folder: 'kb1f3', ext: 'docx', size: '1.6 MB', level: 'L3', governed: false, owner: '张明', updated: '2026-11-21' },
          { id: 'kb1d8', name: '供应商质量评价记录.xlsx', folder: 'kb1f3', ext: 'xlsx', size: '932 KB', level: 'L2', governed: true, owner: '孙琦', updated: '2026-10-29' }
        ]
      },
      {
        id: 'kb2', name: '保密制度知识库', desc: '保密制度、涉密人员管理、涉密载体登记与年度自查记录。',
        level: 'L4', owner: '王芳', owners: ['u3'], dept: '保密办公室', updated: '2026-11-19', mine: false, canEdit: false,
        folders: [
          { id: 'kb2f1', name: '保密制度', parent: null },
          { id: 'kb2f2', name: '涉密人员', parent: null },
          { id: 'kb2f3', name: '自查与整改', parent: null }
        ],
        docs: [
          { id: 'kb2d1', name: '保守国家秘密管理制度.pdf', folder: 'kb2f1', ext: 'pdf', size: '3.6 MB', level: 'L4', governed: true, owner: '王芳', updated: '2026-11-10' },
          { id: 'kb2d2', name: '涉密人员岗位清单.xlsx', folder: 'kb2f2', ext: 'xlsx', size: '148 KB', level: 'L4', governed: true, owner: '王芳', updated: '2026-11-15' },
          { id: 'kb2d3', name: '2026 年度保密自查报告.docx', folder: 'kb2f3', ext: 'docx', size: '1.2 MB', level: 'L4', governed: false, owner: '王芳', updated: '2026-11-19' }
        ]
      },
      {
        id: 'kb3', name: '产品研发知识库', desc: '产品路线图、需求规格、结构设计规范与各阶段评审记录。',
        level: 'L2', owner: '李思', owners: ['u2', 'u4'], dept: '产品研发部', updated: '2026-11-21', mine: false, canEdit: false,
        folders: [
          { id: 'kb3f1', name: '产品规划', parent: null },
          { id: 'kb3f2', name: '需求文档', parent: null },
          { id: 'kb3f3', name: '设计规范', parent: null },
          { id: 'kb3f4', name: '评审记录', parent: null }
        ],
        docs: [
          { id: 'kb3d1', name: '2027 产品路线图.pptx', folder: 'kb3f1', ext: 'pptx', size: '8.4 MB', level: 'L2', governed: true, owner: '李思', updated: '2026-11-18' },
          { id: 'kb3d2', name: 'UWork 桌面端需求规格说明书.docx', folder: 'kb3f2', ext: 'docx', size: '2.1 MB', level: 'L2', governed: true, owner: '李思', updated: '2026-11-21' },
          { id: 'kb3d3', name: '结构设计通用规范.pdf', folder: 'kb3f3', ext: 'pdf', size: '5.7 MB', level: 'L3', governed: false, owner: '陈浩', updated: '2026-11-09' },
          { id: 'kb3d4', name: '设计评审问题清单.xlsx', folder: 'kb3f4', ext: 'xlsx', size: '364 KB', level: 'L2', governed: false, owner: '陈浩', updated: '2026-11-11' }
        ]
      },
      {
        id: 'kb4', name: '通用办公知识库', desc: '行政办公制度、差旅报销流程、常用表单与员工服务指南。',
        level: 'L1', owner: '赵琳', owners: ['u6'], dept: '综合管理部', updated: '2026-11-17', mine: false, canEdit: true,
        folders: [
          { id: 'kb4f1', name: '行政制度', parent: null },
          { id: 'kb4f2', name: '常用表单', parent: null },
          { id: 'kb4f3', name: '员工服务', parent: null }
        ],
        docs: [
          { id: 'kb4d1', name: '差旅费报销管理办法.pdf', folder: 'kb4f1', ext: 'pdf', size: '880 KB', level: 'L1', governed: true, owner: '赵琳', updated: '2026-11-01' },
          { id: 'kb4d2', name: '出差申请单.xlsx', folder: 'kb4f2', ext: 'xlsx', size: '64 KB', level: 'L1', governed: true, owner: '赵琳', updated: '2026-10-20' },
          { id: 'kb4d3', name: '会议室使用指南.md', folder: 'kb4f3', ext: 'md', size: '12 KB', level: 'L1', governed: false, owner: '赵琳', updated: '2026-11-17' }
        ]
      },
      {
        id: 'kb5', name: '公司制度库', desc: '公司治理、人事管理、财务审批与采购管理制度。',
        level: 'L3', owner: '综合管理部', owners: [], dept: '综合管理部', updated: '2026-11-14', mine: false, canEdit: false,
        folders: [
          { id: 'kb5f1', name: '人事制度', parent: null },
          { id: 'kb5f2', name: '财务与采购', parent: null }
        ],
        docs: [
          { id: 'kb5d1', name: '员工手册（2026 版）.pdf', folder: 'kb5f1', ext: 'pdf', size: '3.1 MB', level: 'L2', governed: true, owner: '赵琳', updated: '2026-09-12' },
          { id: 'kb5d2', name: '绩效考核管理办法.docx', folder: 'kb5f1', ext: 'docx', size: '640 KB', level: 'L3', governed: false, owner: '赵琳', updated: '2026-11-14' },
          { id: 'kb5d3', name: '采购审批权限表.xlsx', folder: 'kb5f2', ext: 'xlsx', size: '210 KB', level: 'L3', governed: true, owner: '赵琳', updated: '2026-10-08' }
        ]
      },
      {
        id: 'kb7', name: '保密管理制度库', desc: '面向秘密级员工开放的保密责任制、涉密载体与信息系统保密要求。',
        level: 'L3', owner: '王芳', owners: ['u3'], dept: '保密办公室', updated: '2026-11-18', mine: false, canEdit: false,
        folders: [
          { id: 'kb7f1', name: '保密责任制', parent: null },
          { id: 'kb7f2', name: '涉密载体管理', parent: null },
          { id: 'kb7f3', name: '信息系统保密', parent: null }
        ],
        docs: [
          { id: 'kb7d1', name: '保密工作责任制实施细则.docx', folder: 'kb7f1', ext: 'docx', size: '540 KB', level: 'L3', governed: true, owner: '王芳', updated: '2026-11-02' },
          { id: 'kb7d2', name: '涉密载体借阅与归还流程.pdf', folder: 'kb7f2', ext: 'pdf', size: '820 KB', level: 'L3', governed: true, owner: '王芳', updated: '2026-11-18' },
          { id: 'kb7d3', name: '涉密载体登记台账.xlsx', folder: 'kb7f2', ext: 'xlsx', size: '196 KB', level: 'L3', governed: false, owner: '王芳', updated: '2026-11-20' },
          { id: 'kb7d4', name: '办公终端保密检查清单.docx', folder: 'kb7f3', ext: 'docx', size: '128 KB', level: 'L3', governed: false, owner: '王芳', updated: '2026-11-12' }
        ]
      },
      {
        id: 'kb6', name: '董事会会议纪要', desc: '董事会、经营分析会会议纪要与决议事项跟踪。',
        level: 'L5', owner: '董事会办公室', owners: [], dept: '综合管理部', updated: '2026-11-13', mine: false, canEdit: false,
        folders: [{ id: 'kb6f1', name: '会议纪要', parent: null }],
        docs: [
          { id: 'kb6d1', name: '2026 年第三次董事会纪要.pdf', folder: 'kb6f1', ext: 'pdf', size: '1.4 MB', level: 'L5', governed: true, owner: '董事会办公室', updated: '2026-11-13' }
        ]
      }
    ],
    templateFolders: [
      { id: 'tf0', name: '未分类', parent: null, canEdit: true, owner: '系统管理员' },
      { id: 'tf1', name: '质量管理', parent: null, canEdit: true, owner: '张明' },
      { id: 'tf11', name: '体系文件', parent: 'tf1', canEdit: true, owner: '张明' },
      { id: 'tf12', name: '质量记录', parent: 'tf1', canEdit: true, owner: '张明' },
      { id: 'tf2', name: '保密管理', parent: null, canEdit: false, owner: '王芳' },
      { id: 'tf3', name: '产品研发', parent: null, canEdit: true, owner: '李思' },
      { id: 'tf31', name: '需求与方案', parent: 'tf3', canEdit: true, owner: '李思' },
      { id: 'tf32', name: '设计输出', parent: 'tf3', canEdit: true, owner: '陈浩' },
      { id: 'tf4', name: '行政办公', parent: null, canEdit: true, owner: '赵琳' },
      { id: 'tf5', name: '人力资源', parent: null, canEdit: false, owner: '综合管理部' },
      { id: 'tf6', name: '项目管理', parent: null, canEdit: true, owner: '李思' }
    ],
    templates: [
      { id: 't1', name: '质量目标分解表.xlsx', folder: 'tf12', ext: 'xlsx', size: '86 KB', level: 'L3', owner: '张明', updated: '2026-11-19' },
      { id: 't2', name: '8D 问题解决报告模板.docx', folder: 'tf1', ext: 'docx', size: '142 KB', level: 'L3', owner: '张明', updated: '2026-11-18' },
      { id: 't3', name: '内审不符合项报告.docx', folder: 'tf11', ext: 'docx', size: '96 KB', level: 'L3', owner: '张明', updated: '2026-11-08' },
      { id: 't4', name: '管理评审报告模板.docx', folder: 'tf11', ext: 'docx', size: '188 KB', level: 'L3', owner: '王芳', updated: '2026-10-30' },
      { id: 't5', name: '涉密载体登记表.xlsx', folder: 'tf2', ext: 'xlsx', size: '74 KB', level: 'L4', owner: '王芳', updated: '2026-11-06' },
      { id: 't6', name: '保密检查记录表.docx', folder: 'tf2', ext: 'docx', size: '58 KB', level: 'L4', owner: '王芳', updated: '2026-10-25' },
      { id: 't7', name: '产品需求规格说明书.docx', folder: 'tf31', ext: 'docx', size: '216 KB', level: 'L2', owner: '李思', updated: '2026-11-21' },
      { id: 't8', name: '设计输入输出清单.xlsx', folder: 'tf32', ext: 'xlsx', size: '112 KB', level: 'L2', owner: '陈浩', updated: '2026-11-12' },
      { id: 't9', name: '会议纪要模板.docx', folder: 'tf4', ext: 'docx', size: '42 KB', level: 'L1', owner: '赵琳', updated: '2026-11-17' },
      { id: 't10', name: '出差申请单.xlsx', folder: 'tf4', ext: 'xlsx', size: '36 KB', level: 'L1', owner: '赵琳', updated: '2026-10-20' },
      { id: 't11', name: '员工入职资料清单.docx', folder: 'tf5', ext: 'docx', size: '64 KB', level: 'L2', owner: '综合管理部', updated: '2026-09-14' },
      { id: 't12', name: '项目周报模板.xlsx', folder: 'tf6', ext: 'xlsx', size: '58 KB', level: 'L2', owner: '李思', updated: '2026-11-10' },
      { id: 't13', name: '技术评审检查表.xlsx', folder: 'tf32', ext: 'xlsx', size: '92 KB', level: 'L3', owner: '陈浩', updated: '2026-11-15' }
    ],
    models: [
      { id: 'm1', name: 'UWork-1.5-Pro', provider: 'UWork 自研', context: '128K', level: 'L2', status: '启用', isDefault: true, desc: '通用复杂任务，兼顾推理质量与响应速度' },
      { id: 'm2', name: 'UWork-1.5-Flash', provider: 'UWork 自研', context: '128K', level: 'L1', status: '启用', isDefault: false, desc: '轻量快速，适合日常问答与摘要' },
      { id: 'm3', name: 'UWork-Reasoner', provider: 'UWork 自研', context: '256K', level: 'L3', status: '启用', isDefault: false, desc: '深度推理，适合质量分析与方案论证' },
      { id: 'm4', name: 'UWork-Vision', provider: 'UWork 自研', context: '32K', level: 'L2', status: '启用', isDefault: false, desc: '图文理解，支持图纸与扫描件解析' },
      { id: 'm5', name: 'UWork-Code', provider: 'UWork 自研', context: '128K', level: 'L3', status: '启用', isDefault: false, desc: '代码理解与生成，支持私有仓库' },
      { id: 'm6', name: 'UWork-Local-7B', provider: '本地部署', context: '32K', level: 'L4', status: '停用', isDefault: false, desc: '内网离线部署，数据不出域' }
    ],
    skills: [
      { id: 's1', name: '公文写作', category: '办公写作', level: 'L1', version: '2.3.0', status: '启用', desc: '按党政机关公文格式起草通知、请示、函与报告', runs: 1248, pkg: { name: '公文写作-v2.3.0.zip', size: '2.8 MB', uploaded: '2026-11-18 10:24' } },
      { id: 's2', name: '会议纪要', category: '办公写作', level: 'L2', version: '1.8.2', status: '启用', desc: '从会议记录中提炼决议、责任人与待办事项', runs: 986, pkg: { name: '会议纪要-v1.8.2.zip', size: '2.1 MB', uploaded: '2026-11-16 15:40' } },
      { id: 's3', name: '质量8D分析', category: '质量管理', level: 'L3', version: '3.1.0', status: '启用', desc: '从问题描述生成 D1-D8 分析报告与整改建议', runs: 432, pkg: { name: '质量8D分析-v3.1.0.zip', size: '4.6 MB', uploaded: '2026-11-19 09:12' } },
      { id: 's4', name: '内审检查', category: '质量管理', level: 'L3', version: '1.4.0', status: '启用', desc: '依据体系条款生成内审检查表与不符合项清单', runs: 318, pkg: { name: '内审检查-v1.4.0.zip', size: '3.2 MB', uploaded: '2026-11-11 14:05' } },
      { id: 's5', name: '保密合规自查', category: '保密管理', level: 'L3', version: '2.0.1', status: '启用', desc: '对照保密制度检查文档、流程与人员权限', runs: 204, pkg: { name: '保密合规自查-v2.0.1.zip', size: '1.9 MB', uploaded: '2026-11-14 11:26' } },
      { id: 's6', name: '合同审查', category: '法务合规', level: 'L4', version: '1.6.0', status: '启用', desc: '识别合同风险条款并给出修改建议', runs: 176, pkg: { name: '合同审查-v1.6.0.zip', size: '3.8 MB', uploaded: '2026-11-08 16:33' } },
      { id: 's7', name: '产品需求拆解', category: '产品研发', level: 'L2', version: '2.2.0', status: '启用', desc: '将业务需求拆解为用户故事与验收标准', runs: 521, pkg: { name: '产品需求拆解-v2.2.0.zip', size: '2.4 MB', uploaded: '2026-11-20 10:07' } },
      { id: 's8', name: '图纸解析', category: '产品研发', level: 'L3', version: '1.1.0', status: '启用', desc: '读取二维图纸尺寸、公差与技术要求', runs: 143, pkg: { name: '图纸解析-v1.1.0.zip', size: '6.1 MB', uploaded: '2026-11-05 13:48' } },
      { id: 's9', name: '数据透视', category: '数据分析', level: 'L1', version: '3.0.4', status: '启用', desc: '对表格数据进行统计、对比与可视化建议', runs: 1673, pkg: { name: '数据透视-v3.0.4.zip', size: '1.6 MB', uploaded: '2026-11-17 17:21' } },
      { id: 's10', name: '网页检索', category: '通用能力', level: 'L1', version: '2.5.0', status: '启用', desc: '联网检索公开资料并给出来源引用', runs: 3021, pkg: { name: '网页检索-v2.5.0.zip', size: '1.2 MB', uploaded: '2026-11-21 09:36' } }
    ],
    connectors: [
      { id: 'c1', name: '企业微信', category: '即时通讯', level: 'L2', status: '已连接', endpoint: 'qy.weixin.qq.com', desc: '同步组织架构、消息与待办' },
      { id: 'c2', name: '腾讯文档', category: '在线文档', level: 'L2', status: '已连接', endpoint: 'docs.qq.com', desc: '读取与写入在线文档、表格' },
      { id: 'c3', name: '乐享知识库', category: '知识库', level: 'L3', status: '已连接', endpoint: 'lexiang.tencent.com', desc: '检索企业知识库与文档目录' },
      { id: 'c4', name: 'OA 协同办公', category: '协同办公', level: 'L3', status: '已连接', endpoint: 'oa.uwork.cn', desc: '发起审批、查询流程状态' },
      { id: 'c5', name: 'PLM 研发平台', category: '研发管理', level: 'L4', status: '已连接', endpoint: 'plm.uwork.cn', desc: '读取产品结构、图纸与变更单' },
      { id: 'c6', name: '企业邮箱', category: '邮件', level: 'L1', status: '已连接', endpoint: 'mail.uwork.cn', desc: '收发邮件与日程邀请' },
      { id: 'c7', name: 'GitLab', category: '代码托管', level: 'L3', status: '未连接', endpoint: 'git.uwork.cn', desc: '代码仓库检索与合并请求' },
      { id: 'c8', name: '腾讯会议', category: '会议', level: 'L1', status: '已连接', endpoint: 'meeting.tencent.com', desc: '创建会议、获取转写记录' },
      { id: 'c9', name: '钉钉', category: '即时通讯', level: 'L2', status: '未连接', endpoint: 'dingtalk.com', desc: '同步外部协作群消息' },
      { id: 'c10', name: '用友 ERP', category: '经营财务', level: 'L4', status: '已连接', endpoint: 'erp.uwork.cn', desc: '查询采购、库存与成本数据' }
    ],
    clientReleases: [
      {
        id: 'rel1', version: '1.6.0', channel: '正式版', platform: 'Windows', updateType: '可选更新',
        status: '已发布', publishedAt: '2026-11-18 10:30', file: 'UWork-Setup-1.6.0.exe', size: '86.4 MB', downloads: 268,
        notes: ['新增技能包上传与技能版本管理', '优化文档模板选择与知识库检索', '修复客户端长时间运行后的内存占用问题']
      },
      {
        id: 'rel2', version: '1.5.0', channel: '正式版', platform: 'Windows', updateType: '可选更新',
        status: '已发布', publishedAt: '2026-10-12 09:00', file: 'UWork-Setup-1.5.0.exe', size: '82.1 MB', downloads: 1246,
        notes: ['新增质量体系、保密体系与产品设计开发智能体', '支持文档模板目录勾选与带入对话']
      },
      {
        id: 'rel3', version: '1.7.0-beta.1', channel: '灰度版', platform: 'Windows', updateType: '可选更新',
        status: '草稿', publishedAt: '—', file: 'UWork-Setup-1.7.0-beta.1.exe', size: '91.2 MB', downloads: 0,
        notes: ['实验性：客户端自动更新流程', '新增更新包断点续传与失败重试']
      },
      {
        id: 'rel4', version: '1.5.1', channel: '正式版', platform: 'Windows', updateType: '强制更新',
        status: '已下架', publishedAt: '2026-10-20 14:20', file: 'UWork-Setup-1.5.1.exe', size: '83.0 MB', downloads: 96,
        notes: ['修复登录态失效问题（已下架）']
      }
    ],
    clientUpdatePolicy: { minVersion: '1.4.0', channel: '正式版', checkOnLaunch: true, interval: '每 6 小时' },
    menus: [
      { id: 'menu1', name: '知识库', parent: null, path: '/knowledge', type: '菜单', perm: 'kb:view', order: 1, status: '启用' },
      { id: 'menu2', name: '文档模板', parent: null, path: '/templates', type: '菜单', perm: 'tpl:view', order: 2, status: '启用' },
      { id: 'menu3', name: '模型管理', parent: null, path: '/models', type: '菜单', perm: 'model:manage', order: 3, status: '启用' },
      { id: 'menu4', name: '技能管理', parent: null, path: '/skills', type: '菜单', perm: 'skill:manage', order: 4, status: '启用' },
      { id: 'menu5', name: '连接器管理', parent: null, path: '/connectors', type: '菜单', perm: 'connector:manage', order: 5, status: '启用' },
      { id: 'menu6', name: '系统管理', parent: null, path: '/system', type: '目录', perm: '', order: 6, status: '启用' },
      { id: 'menu61', name: '用户管理', parent: 'menu6', path: '/system/users', type: '菜单', perm: 'sys:user', order: 1, status: '启用' },
      { id: 'menu62', name: '角色管理', parent: 'menu6', path: '/system/roles', type: '菜单', perm: 'sys:role', order: 2, status: '启用' },
      { id: 'menu63', name: '密级管理', parent: 'menu6', path: '/system/levels', type: '菜单', perm: 'sys:level', order: 3, status: '启用' },
      { id: 'menu64', name: '菜单管理', parent: 'menu6', path: '/system/menus', type: '菜单', perm: 'sys:menu', order: 4, status: '启用' },
      { id: 'menu65', name: '部门管理', parent: 'menu6', path: '/system/depts', type: '菜单', perm: 'sys:dept', order: 5, status: '启用' },
      { id: 'menu66', name: '岗位管理', parent: 'menu6', path: '/system/posts', type: '菜单', perm: 'sys:post', order: 6, status: '启用' },
      { id: 'menu67', name: '字典管理', parent: 'menu6', path: '/system/dicts', type: '菜单', perm: 'sys:dict', order: 7, status: '启用' },
      { id: 'menu68', name: '参数设置', parent: 'menu6', path: '/system/params', type: '菜单', perm: 'sys:param', order: 8, status: '启用' },
      { id: 'menu7', name: '通知公告', parent: null, path: '/notices', type: '菜单', perm: 'notice:manage', order: 7, status: '启用' }
    ],
    dicts: [
      { id: 'dict1', name: '数据密级', code: 'data_level', items: ['公开', '内部', '秘密', '机密', '绝密'], status: '启用', remark: '用于知识库、模板、模型、技能、连接器的访问控制' },
      { id: 'dict2', name: '用户状态', code: 'user_status', items: ['启用', '停用', '锁定'], status: '启用', remark: '控制账号是否可登录客户端' },
      { id: 'dict3', name: '文档类型', code: 'doc_type', items: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'png', 'jpg'], status: '启用', remark: '知识库上传与模板上传的允许格式' },
      { id: 'dict4', name: '知识库权限', code: 'kb_permission', items: ['仅查看', '可编辑', '可管理'], status: '启用', remark: '控制客户端知识库操作权限' },
      { id: 'dict5', name: '连接状态', code: 'connector_status', items: ['已连接', '未连接', '连接异常'], status: '启用', remark: '连接器运行状态' }
    ],
    params: [
      { id: 'param1', name: '系统名称', key: 'system.name', value: 'UWork 智能体', group: '基础设置', remark: '客户端与管理端展示名称' },
      { id: 'param2', name: '默认数据密级', key: 'data.defaultLevel', value: 'L2', group: '安全设置', remark: '新建知识库/模板时的默认密级' },
      { id: 'param3', name: '上传大小上限', key: 'upload.maxSize', value: '200 MB', group: '上传设置', remark: '单个文件最大体积' },
      { id: 'param4', name: '允许上传格式', key: 'upload.types', value: 'pdf,doc,docx,ppt,pptx,xls,xlsx,txt,md,png,jpg', group: '上传设置', remark: '知识库与模板允许的扩展名' },
      { id: 'param5', name: '智能治理策略', key: 'governance.policy', value: '自动切片 + 摘要 + 密级校验', group: '智能治理', remark: '文档治理时执行的流水线' },
      { id: 'param6', name: '登录失败锁定', key: 'security.lock', value: '5 次 / 30 分钟', group: '安全设置', remark: '连续失败后的锁定策略' },
      { id: 'param7', name: '水印', key: 'security.watermark', value: '开启', group: '安全设置', remark: '客户端预览密级文档时显示用户水印' }
    ],
    notices: [
      { id: 'n1', title: 'UWork 智能体 1.5 版本发布', type: '版本更新', level: 'L1', publisher: '产品研发部', time: '2026-11-21 09:30', status: '已发布', content: '新增质量体系、保密体系、产品设计开发三个专业智能体，支持知识库与文档模板选择。' },
      { id: 'n2', title: '关于开展 2026 年度保密自查的通知', type: '制度通知', level: 'L3', publisher: '保密办公室', time: '2026-11-18 14:10', status: '已发布', content: '请各部门于 11 月 30 日前完成保密自查，并在知识库中上传自查记录。' },
      { id: 'n3', title: '知识库智能治理规则调整说明', type: '产品公告', level: 'L2', publisher: '信息技术部', time: '2026-11-15 10:00', status: '草稿', content: '文档治理将增加密级校验步骤，治理失败时会阻止文档被智能体引用。' }
    ],
    auditLogs: [
      { id: 'audit-1', time: '2026-11-22 09:12', user: '系统管理员', type: '知识库', action: '新增', target: '质量体系知识库', detail: '所属部门 质量管理部 · 秘密级 · 负责人 张明' },
      { id: 'audit-2', time: '2026-11-21 18:40', user: '系统管理员', type: '知识文档', action: '新增', target: '质量手册（2026 版）.pdf', detail: '知识库「质量体系知识库」 · 秘密级' },
      { id: 'audit-3', time: '2026-11-21 17:45', user: '王芳', type: '文档模板', action: '编辑', target: '保密检查记录表.docx', detail: '分类「保密管理」 · 机密级' },
      { id: 'audit-4', time: '2026-11-21 16:20', user: '系统管理员', type: '知识库', action: '编辑', target: '产品研发知识库', detail: '负责人改为 李思、陈浩 · 内部级' },
      { id: 'audit-5', time: '2026-11-20 15:02', user: '系统管理员', type: '模板目录', action: '新增', target: '2026 年度保密', detail: '可见部门：保密办公室' },
      { id: 'audit-6', time: '2026-11-20 11:30', user: '张明', type: '知识文档', action: '删除', target: '旧版质量手册.pdf', detail: '知识库「质量体系知识库」' },
      { id: 'audit-7', time: '2026-11-19 10:15', user: '系统管理员', type: '知识库', action: '查看', target: '董事会会议纪要', detail: '进入知识库详情' },
      { id: 'audit-8', time: '2026-11-18 14:10', user: '系统管理员', type: '文档模板', action: '删除', target: '旧版内审检查表.docx', detail: '分类「质量管理」' },
      { id: 'audit-9', time: '2026-11-17 09:05', user: '系统管理员', type: '文档模板', action: '新增', target: '8D 分析报告模板.docx', detail: '分类「质量管理」 · 秘密级' }
    ],
  };

  window.UWORK_LEVELS = levels;
  window.UWORK_SEED = seed;
})();
