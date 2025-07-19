# 🌽 Corn Personality Test / 玉米人格测试

5 profoundly stupid questions. One personality result you don't deserve.
5 道神经病问题，换一个你不配拥有的称号。

More accurate than your star sign. Not scientific at all.
比星座准，但毫无科学依据。

## Run / 运行

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.
浏览器打开 `http://localhost:3000`。

## Play with friends / 怎么跟朋友一起玩

If you and your friends are on the same WiFi, check your local IP and share it:/如果你们在同一个 WiFi 下，查本机 IP 发给朋友：

```bash
ipconfig getifaddr en0   # macOS
hostname -I              # Linux
```

Friend visits `http://你的IP:3000`.

If not on the same network, use ngrok or cloudflare tunnel:/不在一个网络的话用 ngrok 或 cloudflare 打个公网隧道：

```bash
brew install ngrok && ngrok http 3000
# or / 或者
npx cloudflared tunnel --url http://localhost:3000
```

Share the public URL with friends / 把输出的公网链接发给朋友。

How it works / 怎么玩：

1. One person clicks **Play with Friends** → **Host & Start** → pick a dimension / 一个人点 **Play with Friends** → **Host & Start** → 选维度
2. Share the room code / 把房间码发给朋友
3. Friend clicks **Play with Friends** → enters room code → **Join Room** / 朋友点 **Play with Friends** → 输入房间码 → **Join Room**
4. Everyone answers 5 questions. Results reveal when all are done / 各自答完 5 道题，所有人完成后一起揭晓

## Stack / 技术栈

Vite + React + Express + Socket.io, all TypeScript.

## Env / 环境变量

| Variable | What it does |
|---|---|
| `PORT` | Port, default 3000 / 端口，默认 3000 |
| `OPENAI_API_KEY` | Optional. With it, GPT generates weirder results. Without it, local scoring rules. / 可选的。设了会用 GPT 生成更神经的结果，不设就用本地规则 |
