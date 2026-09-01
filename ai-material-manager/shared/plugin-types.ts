// ---- plugin:feishu_bitable_material_receive_record_operation_1 ----
// ============================================================
// 插件 feishu_bitable_material_receive_record_operation_1 (飞书多维表格「领取下载记录表」读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableMaterialReceiveRecordOperationOneInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_material_receive_record_operation_1').call<FeishuBitableMaterialReceiveRecordOperationOneOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableMaterialReceiveRecordOperationOneOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}
// ---- end:feishu_bitable_material_receive_record_operation_1 ----

// ---- plugin:feishu_bitable_material_asset_master_table_operation_2 ----
// ============================================================
// 插件 feishu_bitable_material_asset_master_table_operation_2 (飞书多维表格物料资产主表读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableMaterialAssetMasterTableOperationTwoBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
    id: string;
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_material_asset_master_table_operation_2').call<FeishuBitableMaterialAssetMasterTableOperationTwoBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableMaterialAssetMasterTableOperationTwoBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableMaterialAssetMasterTableOperationTwoGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_material_asset_master_table_operation_2').call<FeishuBitableMaterialAssetMasterTableOperationTwoGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface FeishuBitableMaterialAssetMasterTableOperationTwoGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}
// ---- end:feishu_bitable_material_asset_master_table_operation_2 ----

// ---- plugin:feishu_bitable_claim_download_record_operation_1 ----
// ============================================================
// 插件 feishu_bitable_claim_download_record_operation_1 (飞书多维表格「领取下载记录表」写入实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================
// ---- end:feishu_bitable_claim_download_record_operation_1 ----

// ---- plugin:feishu_bitable_claim_download_record_write_1 ----
// ============================================================
// 插件 feishu_bitable_claim_download_record_write_1 (飞书多维表格「领取下载记录表」写入实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================
// ---- end:feishu_bitable_claim_download_record_write_1 ----

// ---- plugin:feishu_bitable_claim_download_record_write_2 ----
// ============================================================
// 插件 feishu_bitable_claim_download_record_write_2 (飞书多维表格「领取下载记录表」写入实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================
// ---- end:feishu_bitable_claim_download_record_write_2 ----

// ---- plugin:feishu_bitable_material_asset_master_table_operation_3 ----
// ============================================================
// 插件 feishu_bitable_material_asset_master_table_operation_3 (飞书多维表格「物料资产主表」读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableMaterialAssetMasterTableOperationThreeInput {
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_material_asset_master_table_operation_3').call<FeishuBitableMaterialAssetMasterTableOperationThreeOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"发布状态":"示例文本","当前版本":0,"是否推荐":null,"适用区域":[],"风险标签":[],"语言":"示例文本","订阅人":[],"标准命名":null,"物料名称":{},"有效期":0}}]}
 */
export interface FeishuBitableMaterialAssetMasterTableOperationThreeOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '发布状态': string;
      '当前版本': number;
      '是否推荐': unknown;
      '适用区域': string[];
      '风险标签': string[];
      '语言': string;
      '订阅人': number[];
      '标准命名': unknown;
      '物料名称': {
        text: string;
      };
      '有效期': number;
    };
  }[];
}
// ---- end:feishu_bitable_material_asset_master_table_operation_3 ----

// ---- plugin:feishu_bitable_claim_download_record_operation_4 ----
// ============================================================
// 插件 feishu_bitable_claim_download_record_operation_4 (飞书多维表格「领取下载记录表」读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableClaimDownloadRecordOperationFourBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '领取记录': string;
      '所属部门': string[];
      '是否已被新版替代': boolean;
      '下载时间': number;
      '物料': unknown;
      '版本': unknown;
      '领取下载人': number[];
      '所属区域': string;
      '是否已通知': boolean;
      '记录ID（领用）': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_claim_download_record_operation_4').call<FeishuBitableClaimDownloadRecordOperationFourBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableClaimDownloadRecordOperationFourBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableClaimDownloadRecordOperationFourSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      value: string[];
      fieldName: string;
      operator: string;
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_claim_download_record_operation_4').call<FeishuBitableClaimDownloadRecordOperationFourSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"所属区域":"示例文本","是否已被新版替代":null,"是否已通知":null,"下载时间":0,"物料":null,"版本":null,"记录ID（领用）":null,"领取记录":{},"所属部门":[],"领取下载人":[]}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuBitableClaimDownloadRecordOperationFourSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '所属区域': string;
      '是否已被新版替代': unknown;
      '是否已通知': unknown;
      '下载时间': number;
      '物料': unknown;
      '版本': unknown;
      '记录ID（领用）': unknown;
      '领取记录': {
        text: string;
      };
      '所属部门': string[];
      '领取下载人': number[];
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_bitable_claim_download_record_operation_4 ----

// ---- plugin:feishu_bitable_material_asset_master_table_operation_4 ----
// ============================================================
// 插件 feishu_bitable_material_asset_master_table_operation_4 (飞书多维表格物料资产主表读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableMaterialAssetMasterTableOperationFourInput {
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conditions: {
      operator: string;
      value: string[];
      fieldName: string;
    }[];
    conjunction: string;
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
}

/**
 * capabilityClient.load('feishu_bitable_material_asset_master_table_operation_4').call<FeishuBitableMaterialAssetMasterTableOperationFourOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"标准命名":null,"物料名称":{},"有效期":0,"语言":"示例文本","适用区域":[],"发布状态":"示例文本","当前版本":null,"是否推荐使用":null,"风险标签":[],"订阅者":[],"策划及审核人":[],"设计师":[]}}]}
 */
export interface FeishuBitableMaterialAssetMasterTableOperationFourOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '标准命名': unknown;
      '物料名称': {
        text: string;
      };
      '有效期': number;
      '语言': string;
      '适用区域': string[];
      '发布状态': string;
      '当前版本': unknown;
      '是否推荐使用': unknown;
      '风险标签': string[];
      '订阅者': number[];
      '策划及审核人': number[];
      '设计师': number[];
    };
  }[];
}
// ---- end:feishu_bitable_material_asset_master_table_operation_4 ----

// ---- plugin:feishu_bitable_issue_feedback_table_operation_1 ----
// ============================================================
// 插件 feishu_bitable_issue_feedback_table_operation_1 (飞书多维表格「问题反馈表」读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableIssueFeedbackTableOperationOneAggregatequeryInput {
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    aggregation: string;
    alias: string;
    fieldName: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    desc: boolean;
    fieldName: string;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
}

/**
 * capabilityClient.load('feishu_bitable_issue_feedback_table_operation_1').call<FeishuBitableIssueFeedbackTableOperationOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableIssueFeedbackTableOperationOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FeishuBitableIssueFeedbackTableOperationOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '问题标题': string;
      '严重程度': string;
      '关联物料': unknown;
      '关联版本': unknown;
      '处理状态': string;
      '问题类型': string;
      '问题描述': string;
      '反馈人': number[];
      '处理负责人': number[];
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_issue_feedback_table_operation_1').call<FeishuBitableIssueFeedbackTableOperationOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableIssueFeedbackTableOperationOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableIssueFeedbackTableOperationOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '问题描述': string;
      '关联物料': unknown;
      '关联版本': unknown;
      '处理状态': string;
      '处理负责人': number[];
      '问题标题': string;
      '严重程度': string;
      '反馈人': number[];
      '问题类型': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_issue_feedback_table_operation_1').call<FeishuBitableIssueFeedbackTableOperationOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableIssueFeedbackTableOperationOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableIssueFeedbackTableOperationOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_issue_feedback_table_operation_1').call<FeishuBitableIssueFeedbackTableOperationOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableIssueFeedbackTableOperationOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableIssueFeedbackTableOperationOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_issue_feedback_table_operation_1').call<FeishuBitableIssueFeedbackTableOperationOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"关联物料":null,"问题描述":null,"严重程度":"示例文本","反馈人":[0],"关联版本":null,"处理状态":"示例文本","处理负责人":[0],"问题标题":{"text":"示例文本"},"问题类型":"示例文本"}}
 */
export interface FeishuBitableIssueFeedbackTableOperationOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '关联物料': unknown;
    '问题描述': unknown;
    '严重程度': string;
    '反馈人': number[];
    '关联版本': unknown;
    '处理状态': string;
    '处理负责人': number[];
    '问题标题': {
      text: string;
    };
    '问题类型': string;
  };
}

export interface FeishuBitableIssueFeedbackTableOperationOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
    conjunction: string;
  };
}

/**
 * capabilityClient.load('feishu_bitable_issue_feedback_table_operation_1').call<FeishuBitableIssueFeedbackTableOperationOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"问题类型":"示例文本","处理负责人":[],"关联物料":null,"关联版本":null,"处理状态":"示例文本","问题标题":{},"问题描述":null,"严重程度":"示例文本","反馈人":[]}}],"hasMore":false}
 */
export interface FeishuBitableIssueFeedbackTableOperationOneSearchrecordsOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '问题类型': string;
      '处理负责人': number[];
      '关联物料': unknown;
      '关联版本': unknown;
      '处理状态': string;
      '问题标题': {
        text: string;
      };
      '问题描述': unknown;
      '严重程度': string;
      '反馈人': number[];
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:feishu_bitable_issue_feedback_table_operation_1 ----

// ---- plugin:feishu_bitable_system_config_table_read_1 ----
// ============================================================
// 插件 feishu_bitable_system_config_table_read_1 (飞书多维表格「系统配置表」读取实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableSystemConfigTableReadOneInput {
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
    conjunction: string;
  };
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('feishu_bitable_system_config_table_read_1').call<FeishuBitableSystemConfigTableReadOneOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"文本值":null,"图片":[],"有效期":0,"是否启用":null,"备注":null,"配置键":{},"配置名称":null}}]}
 */
export interface FeishuBitableSystemConfigTableReadOneOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '文本值': unknown;
      '图片': {
        name: string;
        size: number;
        tmpUrl: string;
        type: string;
      }[];
      '有效期': number;
      '是否启用': unknown;
      '备注': unknown;
      '配置键': {
        text: string;
      };
      '配置名称': unknown;
    };
  }[];
}
// ---- end:feishu_bitable_system_config_table_read_1 ----

// ---- plugin:feishu_bitable_ai_pending_pool_operation_1 ----
// ============================================================
// 插件 feishu_bitable_ai_pending_pool_operation_1 (飞书多维表格「AI待处理池」表读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableAiPendingPoolOperationOneAggregatequeryInput {
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conditions: {
      value: string[];
      fieldName: string;
      operator: string;
    }[];
    conjunction: string;
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    aggregation: string;
    alias: string;
    fieldName: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_1').call<FeishuBitableAiPendingPoolOperationOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, result } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","result":[{}]}
 */
export interface FeishuBitableAiPendingPoolOperationOneAggregatequeryOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
}

export interface FeishuBitableAiPendingPoolOperationOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      'AI识别结果': string;
      '是否为版本替换': boolean;
      '云盘链接M': {
        link: string;
        text: string;
      };
      '确认后自动发布': boolean;
      '关联主表': unknown;
      '源文件(L)': string[];
      '确认结果': string;
      '上传者': number[];
      '设计师': number[];
      '用户补充回复': string;
      '原始文件名': string;
      '上传方式': string;
      '用户填写说明': string;
      '处理锁': boolean;
      '处理日志': string;
      '云盘链接L': unknown;
      '关联旧版本': unknown;
      '上传文件': string[];
      '设计Brief': string;
      '处理状态': string;
      '缺失信息': string;
      '重试次数': number;
      '策划人及审核人': string[];
      '云盘链接S': unknown;
      '是否大文件': boolean;
      '上传时间': number;
      '预览文件（S）': string[];
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_1').call<FeishuBitableAiPendingPoolOperationOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAiPendingPoolOperationOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAiPendingPoolOperationOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '处理日志': string;
      '策划人及审核人': string[];
      '设计师': number[];
      '云盘链接M': {
        text: string;
        link: string;
      };
      '上传文件': string[];
      '设计Brief': string;
      '确认结果': string;
      '处理状态': string;
      'AI识别结果': string;
      '缺失信息': string;
      '是否为版本替换': boolean;
      '是否大文件': boolean;
      '原始文件名': string;
      '上传时间': number;
      '预览文件（S）': string[];
      '云盘链接S': unknown;
      '用户补充回复': string;
      '确认后自动发布': boolean;
      '上传者': number[];
      '用户填写说明': string;
      '重试次数': number;
      '云盘链接L': unknown;
      '关联旧版本': unknown;
      '关联主表': unknown;
      '上传方式': string;
      '处理锁': boolean;
      '源文件(L)': string[];
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_1').call<FeishuBitableAiPendingPoolOperationOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAiPendingPoolOperationOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAiPendingPoolOperationOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_1').call<FeishuBitableAiPendingPoolOperationOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableAiPendingPoolOperationOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableAiPendingPoolOperationOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_1').call<FeishuBitableAiPendingPoolOperationOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"上传文件":[{"type":"示例文本","name":"示例文本","size":0,"tmpUrl":"示例文本"}],"上传方式":null,"用户填写说明":null,"预览文件（S）":[null],"重试次数":0,"云盘链接M":{"text":"示例文本","link":"示例文本"},"用户补充回复":null,"原始文件名":{"text":"示例文本"},"缺失信息":null,"设计师":[0],"是否为版本替换":null,"云盘链接L":null,"确认后自动发布":null,"处理锁":null,"上传者":[0],"上传时间":0,"处理状态":"示例文本","确认结果":"示例文本","处理日志":null,"策划人及审核人":["示例文本"],"关联旧版本":null,"设计Brief":null,"AI识别结果":null,"云盘链接S":null,"是否大文件":null,"关联主表":null,"源文件(L)":[null]}}
 */
export interface FeishuBitableAiPendingPoolOperationOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '上传文件': {
      type: string;
      name: string;
      size: number;
      tmpUrl: string;
    }[];
    '上传方式': unknown;
    '用户填写说明': unknown;
    '预览文件（S）': unknown[];
    '重试次数': number;
    '云盘链接M': {
      text: string;
      link: string;
    };
    '用户补充回复': unknown;
    '原始文件名': {
      text: string;
    };
    '缺失信息': unknown;
    '设计师': number[];
    '是否为版本替换': unknown;
    '云盘链接L': unknown;
    '确认后自动发布': unknown;
    '处理锁': unknown;
    '上传者': number[];
    '上传时间': number;
    '处理状态': string;
    '确认结果': string;
    '处理日志': unknown;
    '策划人及审核人': string[];
    '关联旧版本': unknown;
    '设计Brief': unknown;
    'AI识别结果': unknown;
    '云盘链接S': unknown;
    '是否大文件': unknown;
    '关联主表': unknown;
    '源文件(L)': unknown[];
  };
}

export interface FeishuBitableAiPendingPoolOperationOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_1').call<FeishuBitableAiPendingPoolOperationOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"重试次数":0,"云盘链接S":null,"用户补充回复":null,"关联旧版本":null,"上传方式":null,"上传者":[],"用户填写说明":null,"上传时间":0,"是否为版本替换":null,"确认后自动发布":null,"源文件(L)":[],"预览文件（S）":[],"确认结果":"示例文本","处理日志":null,"云盘链接L":null,"是否大文件":null,"原始文件名":{},"设计Brief":null,"AI识别结果":null,"设计师":[],"策划人及审核人":[],"云盘链接M":{},"关联主表":null,"上传文件":[],"处理锁":null,"处理状态":"示例文本","缺失信息":null}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuBitableAiPendingPoolOperationOneSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '重试次数': number;
      '云盘链接S': unknown;
      '用户补充回复': unknown;
      '关联旧版本': unknown;
      '上传方式': unknown;
      '上传者': number[];
      '用户填写说明': unknown;
      '上传时间': number;
      '是否为版本替换': unknown;
      '确认后自动发布': unknown;
      '源文件(L)': unknown[];
      '预览文件（S）': unknown[];
      '确认结果': string;
      '处理日志': unknown;
      '云盘链接L': unknown;
      '是否大文件': unknown;
      '原始文件名': {
        text: string;
      };
      '设计Brief': unknown;
      'AI识别结果': unknown;
      '设计师': number[];
      '策划人及审核人': string[];
      '云盘链接M': {
        text: string;
        link: string;
      };
      '关联主表': unknown;
      '上传文件': {
        name: string;
        size: number;
        tmpUrl: string;
        type: string;
      }[];
      '处理锁': unknown;
      '处理状态': string;
      '缺失信息': unknown;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_bitable_ai_pending_pool_operation_1 ----

// ---- plugin:feishu_bitable_ai_pending_pool_operation_2 ----
// ============================================================
// 插件 feishu_bitable_ai_pending_pool_operation_2 (飞书多维表格「AI待处理池」读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableAiPendingPoolOperationTwoAggregatequeryInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      value: string[];
      fieldName: string;
      operator: string;
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    aggregation: string;
    alias: string;
    fieldName: string;
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_2').call<FeishuBitableAiPendingPoolOperationTwoAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableAiPendingPoolOperationTwoAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FeishuBitableAiPendingPoolOperationTwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '原始文件名': string;
      '上传方式': string;
      '云盘链接M': string;
      '处理状态': string;
      '确认结果': string;
      '缺失信息': string;
      '是否为版本替换': boolean;
      '云盘链接L': string;
      '是否大文件': boolean;
      '关联主表': unknown;
      '处理锁': boolean;
      '重试次数': number;
      '策划人及审核人': string[];
      '上传者': number[];
      '用户填写说明': string;
      '上传时间': number;
      '源文件(L)': string[];
      '处理日志': string;
      'AI识别结果': string;
      '上传文件': string[];
      '设计Brief': string;
      '用户补充回复': string;
      '确认后自动发布': boolean;
      '关联旧版本': unknown;
      '预览文件（S）': string[];
      '设计师': number[];
      '云盘链接S': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_2').call<FeishuBitableAiPendingPoolOperationTwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAiPendingPoolOperationTwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAiPendingPoolOperationTwoBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '策划人及审核人': string[];
      '云盘链接L': string;
      '是否大文件': boolean;
      '关联旧版本': unknown;
      '处理锁': boolean;
      '预览文件（S）': string[];
      '缺失信息': string;
      '云盘链接M': string;
      '用户补充回复': string;
      '关联主表': unknown;
      '上传文件': string[];
      '上传者': number[];
      '源文件(L)': string[];
      '处理状态': string;
      'AI识别结果': string;
      '处理日志': string;
      '重试次数': number;
      '确认后自动发布': boolean;
      '用户填写说明': string;
      '上传时间': number;
      '上传方式': string;
      '确认结果': string;
      '设计师': number[];
      '是否为版本替换': boolean;
      '云盘链接S': string;
      '原始文件名': string;
      '设计Brief': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_2').call<FeishuBitableAiPendingPoolOperationTwoBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAiPendingPoolOperationTwoBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAiPendingPoolOperationTwoDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_2').call<FeishuBitableAiPendingPoolOperationTwoDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableAiPendingPoolOperationTwoDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableAiPendingPoolOperationTwoGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_2').call<FeishuBitableAiPendingPoolOperationTwoGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"关联主表":null,"原始文件名":{"text":"示例文本"},"上传者":[0],"处理锁":null,"处理状态":"示例文本","用户补充回复":null,"确认后自动发布":null,"上传文件":[{"name":"示例文本","size":0,"tmpUrl":"示例文本","type":"示例文本"}],"上传方式":null,"缺失信息":null,"处理日志":null,"云盘链接S":null,"关联旧版本":null,"上传时间":0,"预览文件（S）":[null],"AI识别结果":null,"设计师":[0],"云盘链接L":null,"是否大文件":null,"是否为版本替换":null,"云盘链接M":null,"设计Brief":null,"用户填写说明":null,"源文件(L)":[null],"确认结果":"示例文本","重试次数":0,"策划人及审核人":["示例文本"]}}
 */
export interface FeishuBitableAiPendingPoolOperationTwoGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '关联主表': unknown;
    '原始文件名': {
      text: string;
    };
    '上传者': number[];
    '处理锁': unknown;
    '处理状态': string;
    '用户补充回复': unknown;
    '确认后自动发布': unknown;
    '上传文件': {
      name: string;
      size: number;
      tmpUrl: string;
      type: string;
    }[];
    '上传方式': unknown;
    '缺失信息': unknown;
    '处理日志': unknown;
    '云盘链接S': unknown;
    '关联旧版本': unknown;
    '上传时间': number;
    '预览文件（S）': unknown[];
    'AI识别结果': unknown;
    '设计师': number[];
    '云盘链接L': unknown;
    '是否大文件': unknown;
    '是否为版本替换': unknown;
    '云盘链接M': unknown;
    '设计Brief': unknown;
    '用户填写说明': unknown;
    '源文件(L)': unknown[];
    '确认结果': string;
    '重试次数': number;
    '策划人及审核人': string[];
  };
}

export interface FeishuBitableAiPendingPoolOperationTwoSearchrecordsInput {
  /** [object Object] */
  sort?: {
    desc: boolean;
    fieldName: string;
  }[];
  /** [object Object] */
  filter?: {
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
    conjunction: string;
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_2').call<FeishuBitableAiPendingPoolOperationTwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"关联旧版本":null,"设计Brief":null,"用户填写说明":null,"上传时间":0,"确认结果":"示例文本","缺失信息":null,"处理日志":null,"云盘链接S":null,"上传方式":null,"上传者":[],"AI识别结果":null,"是否大文件":null,"关联主表":null,"原始文件名":{},"预览文件（S）":[],"处理状态":"示例文本","重试次数":0,"用户补充回复":null,"确认后自动发布":null,"云盘链接L":null,"上传文件":[],"处理锁":null,"源文件(L)":[],"策划人及审核人":[],"设计师":[],"是否为版本替换":null,"云盘链接M":null}}]}
 */
export interface FeishuBitableAiPendingPoolOperationTwoSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '关联旧版本': unknown;
      '设计Brief': unknown;
      '用户填写说明': unknown;
      '上传时间': number;
      '确认结果': string;
      '缺失信息': unknown;
      '处理日志': unknown;
      '云盘链接S': unknown;
      '上传方式': unknown;
      '上传者': number[];
      'AI识别结果': unknown;
      '是否大文件': unknown;
      '关联主表': unknown;
      '原始文件名': {
        text: string;
      };
      '预览文件（S）': unknown[];
      '处理状态': string;
      '重试次数': number;
      '用户补充回复': unknown;
      '确认后自动发布': unknown;
      '云盘链接L': unknown;
      '上传文件': {
        name: string;
        size: number;
        tmpUrl: string;
        type: string;
      }[];
      '处理锁': unknown;
      '源文件(L)': unknown[];
      '策划人及审核人': string[];
      '设计师': number[];
      '是否为版本替换': unknown;
      '云盘链接M': unknown;
    };
  }[];
}
// ---- end:feishu_bitable_ai_pending_pool_operation_2 ----

// ---- plugin:feishu_bitable_ai_pending_pool_operation_3 ----
// ============================================================
// 插件 feishu_bitable_ai_pending_pool_operation_3 (飞书多维表格「AI待处理池」读写实例 v3) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableAiPendingPoolOperationThreeInput {
  /** [object Object] */
  records: {
    record: {
      '处理状态': string;
      '是否为版本替换': boolean;
      '云盘链接M': string;
      '用户补充回复': string;
      '确认后自动发布': boolean;
      '用户填写说明': string;
      '处理锁': boolean;
      '源文件(L)': string[];
      '关联旧版本': unknown;
      'AI追问对象': number[];
      '设计Brief': {
        text: string;
        link: string;
      };
      '确认结果': string;
      '设计师': number[];
      '重试次数': number;
      '策划人及审核人': number[];
      '云盘链接L': string;
      '是否大文件': boolean;
      '关联主表': unknown;
      '原始文件名': string;
      '上传方式': string;
      '处理日志': string;
      'AI识别结果': string;
      '缺失信息': string;
      '云盘链接S': string;
      '上传文件（M）': string[];
      '上传者': number[];
      '预览文件（S）': string[];
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_ai_pending_pool_operation_3').call<FeishuBitableAiPendingPoolOperationThreeOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAiPendingPoolOperationThreeOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}
// ---- end:feishu_bitable_ai_pending_pool_operation_3 ----