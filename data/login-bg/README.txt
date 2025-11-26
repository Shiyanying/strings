======================================
  登录背景图片文件夹
======================================

使用方法：
1. 将你的图片放到这个文件夹（支持 png/jpg/gif）
2. 修改 client/src/components/LoginView.jsx 第 11 行：

   const CUSTOM_BG_IMAGE = '/api/login-bg/你的图片名.png';

3. 重启服务即可生效

示例：
- 放入图片：background.png
- 修改配置：const CUSTOM_BG_IMAGE = '/api/login-bg/background.png';

提示：
- 设为 null 则显示默认彩色粒子效果
- 建议使用简单图形或 logo，复杂图片粒子效果可能不明显
