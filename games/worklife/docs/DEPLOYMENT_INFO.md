# WorkLife 游戏 - Ngrok 部署信息

## 🎉 部署成功！

### 公网访问地址
```
https://marvelous-noncustomarily-yung.ngrok-free.dev
```

**✅ 已解决Vite CORS问题，现在可以正常访问！**

### 本地服务地址
- **前端服务**: http://localhost:3000
- **后端服务**: http://127.0.0.1:3001
- **Ngrok 监控面板**: http://127.0.0.1:4040

### 部署时间
2026年1月11日

### 账号信息
- **Ngrok 账号**: yzhan722
- **计划**: Free（免费版）
- **区域**: Asia Pacific (ap)

## 📝 使用说明

### 访问游戏
1. 直接在浏览器中打开公网地址：
   ```
   https://marvelous-noncustomarily-yung.ngrok-free.dev
   ```

2. 首次访问会看到 ngrok 警告页面，点击 **"Visit Site"** 按钮继续

3. 即可看到游戏界面！

### 分享给朋友
直接将公网地址发送给朋友即可：
```
https://marvelous-noncustomarily-yung.ngrok-free.dev
```

## ⚠️ 重要提示

### 免费版限制
- **连接限制**: 40 connections/min
- **会话时长**: 2小时后自动断开，需要重新启动
- **地址变化**: 每次重启 ngrok，公网地址会变化

### 重新启动服务
如果服务停止或需要重启，运行以下命令：

**方法一：使用自动化脚本**
```powershell
cd worklife
.\start-ngrok.ps1
```

**方法二：手动启动**
```powershell
# 窗口1 - 后端
cd worklife\backend
npm run dev

# 窗口2 - 前端
cd worklife\frontend
npm run dev

# 窗口3 - Ngrok
cd worklife
.\ngrok.exe http 3000
```

### 获取新的公网地址
重启后，在 ngrok 窗口中找到 "Forwarding" 行，或访问监控面板：
```
http://127.0.0.1:4040
```

## 🔧 故障排除

### 问题：地址打不开
**解决方案**：
1. 检查后端服务是否运行（端口 3001）
2. 检查前端服务是否运行（端口 3000）
3. 检查 ngrok 是否显示 "online" 状态

### 问题：访问很慢
**原因**：免费版服务器在国外，可能有延迟（200-400ms）

### 问题：连接断开
**解决方案**：免费版 2 小时后会断开，重新运行 ngrok 即可

## 📊 监控面板

访问 http://127.0.0.1:4040 可以查看：
- 实时请求日志
- 访问统计
- 请求详情
- 连接数据

## 🎮 开始游戏

现在你的 WorkLife 游戏已经可以在公网访问了！

祝你游戏愉快！🎉
