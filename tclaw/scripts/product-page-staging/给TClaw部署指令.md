# 部署「产品单页（施工中）」Datasheet 同步器

将整个 `scripts/product-page-staging/` 目录复制到 TClaw 服务器：

```bash
sudo mkdir -p /opt/tclaw/scripts/product-page-staging
sudo cp -a product-page-staging/. /opt/tclaw/scripts/product-page-staging/
cd /opt/tclaw/scripts/product-page-staging
```

编辑 `product_page_staging.env`：将 `LARK_CLI` 改为服务器实际的 `lark-cli` 路径，并保留 `CHANGE_LOG_TABLE_ID=tblQCeUZJTIZpa3p`。不得修改施工表 ID；脚本会拒绝生产表 ID。

首次验证与启用：

```bash
python3 product_page_staging_sync.py --dry-run
sudo cp product-page-staging-sync.service /etc/systemd/system/
sudo cp product-page-staging-sync.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now product-page-staging-sync.timer
systemctl list-timers product-page-staging-sync.timer
```

手动执行一次同步与查看日志：

```bash
sudo systemctl start product-page-staging-sync.service
sudo journalctl -u product-page-staging-sync.service -n 100 --no-pager
```

不要启动 `event consume`、消息监听器或旧的 `drive_upload_listener.sh`。该同步器只用 5 分钟定时检测附件指纹；未变化时不会上传、改表或新增变更记录。每次实际更新会补写周报辅助字段与一条变更历史。
