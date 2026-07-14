import type { BonCvState } from './types';

const now = '2026-07-14T00:00:00.000Z';

export const demoState: BonCvState = {
  schemaVersion: 1,
  revision: 1,
  updatedAt: now,
  profile: {
    name: '示例用户',
    headline: ['可长期实习', '每周到岗 4-5 天'],
    phone: '13800000000',
    email: 'hello@example.com',
    politicalStatus: '',
    origin: '',
    birthDate: '1998-01-01',
    photoUrl: null,
  },
  sections: [
    {
      id: 'education', kind: 'education', title: '教育背景', order: 0,
      entries: [
        {
          id: 'edu-master', sectionId: 'education', title: '机械专业', organization: '示例大学', role: '硕士',
          startDate: '2025-09', endDate: '至今', educationLevel: 'master', educationStatus: 'in_progress',
          graduationDate: null, summary: '推免入学', highlights: ['GPA：3.5/4.0'], meta: [],
        },
        {
          id: 'edu-bachelor', sectionId: 'education', title: '飞行器设计与工程', organization: '示例大学', role: '学士',
          startDate: '2021-09', endDate: '2025-06', educationLevel: 'bachelor', educationStatus: 'completed',
          graduationDate: '2025-06-30', summary: '', highlights: ['专业排名：3/291', '国家奖学金'], meta: [],
        },
      ],
    },
    {
      id: 'research', kind: 'research', title: '科研经历', order: 1,
      entries: [{
        id: 'research-edge-llm', sectionId: 'research', title: '边缘侧私有化 LLM 部署实践', organization: '', role: '负责人',
        startDate: '2024-01', endDate: '', summary: '在边缘计算平台实现大语言模型离线部署。',
        highlights: ['搭建端侧低延迟自然语言处理流水线', '完成架构适配与资源调优'], meta: [],
      }],
    },
    {
      id: 'skills', kind: 'skills', title: '综合技能', order: 2,
      entries: [{
        id: 'skills-main', sectionId: 'skills', title: '技术与兴趣', organization: '', role: '', startDate: '', endDate: '', summary: '',
        highlights: ['C++（熟练）、Python（掌握）、Matlab（掌握）', 'Linux（良好）', '游泳、摄影、阅读'], meta: [],
      }],
    },
  ],
  presets: [{
    id: 'preset-default', name: '完整简历',
    profileFields: ['headline', 'phone', 'email', 'politicalStatus', 'origin'],
    selectedEntryIds: ['edu-master', 'edu-bachelor', 'research-edge-llm', 'skills-main'],
    sectionOrder: ['education', 'research', 'skills'],
    entryOrder: ['edu-master', 'edu-bachelor', 'research-edge-llm', 'skills-main'],
    entryOverrides: {},
    includePhoto: false, createdAt: now, updatedAt: now,
  }],
  builds: [],
  integrationKeys: [],
};
