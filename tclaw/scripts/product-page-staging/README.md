# 产品单页（施工中）Datasheet 同步器

本目录只允许写入施工表 `tblK1lIW8ksoDyRg`。生产表 `tblha90BopV9sDlW` 被脚本硬性拒绝。

首次执行顺序：

1. `python3 product_page_staging_sync.py --dry-run`
2. `python3 product_page_staging_sync.py --migrate-fields`
3. `python3 product_page_staging_sync.py --sync`

之后由 `product-page-staging-sync.timer` 每 5 分钟运行一次。它只在施工表关联的 C&I 附件文件 token、名称或大小变化时上传并回填「最新版 Datasheet」。每次实际回填还会更新隐藏的周报辅助字段，并向 `Datasheet 变更记录` 分表追加一条“施工同步脚本”来源的历史记录；没有变化时不会追加记录。

飞书 OpenAPI 不支持把文本字段直接改成单选。迁移会保留原文本列为隐藏的「分类（旧文本备份）」；新建正式的「分类」单选列并回填值。主字段则无损改为「产品型号」。

部署到 TClaw 时，将本目录复制到 `/opt/tclaw/scripts/product-page-staging/`，把 `LARK_CLI` 改成服务器上的 `lark-cli` 路径，保留 `CHANGE_LOG_TABLE_ID`，先完成用户身份授权，再安装 service 与 timer。
