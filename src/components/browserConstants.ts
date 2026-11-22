/**
 * browserConstants.ts
 * Holds the rich HTML, CSS, and JS code for Virtual Browser v2 sub-apps.
 * These are loaded inside iframes using srcDoc.
 */

// We talks LINE風チャットのHTMLソース
export const CHAT_APP_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    :root {
      --line-green: #06C755;
      --chat-bg: #8cabd9;
      --text-color: #1e1e1e;
      --light-gray: #f4f4f4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; margin: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      display: flex; flex-direction: column; background: #fff; color: var(--text-color); overflow: hidden;
    }
    .header {
      background: var(--line-green); color: white; padding: 12px 16px;
      display: flex; align-items: center; justify-content: space-between; font-weight: bold; flex-shrink: 0;
    }
    .header-btn {
      background: none; border: none; color: white; font-size: 16px; cursor: pointer; outline: none;
    }
    #view-lobby { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .lobby-title { padding: 12px 16px; font-size: 14px; color: #666; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
    #lobby-username-tag {
      font-size: 13px; color: var(--line-green); font-weight: bold; cursor: pointer;
      text-decoration: underline; text-decoration-style: dashed; transition: opacity 0.1s;
    }
    #lobby-username-tag:hover { opacity: 0.8; }
    .room-list { flex: 1; overflow-y: auto; list-style: none; }
    .room-item {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.1s;
    }
    .room-item:hover { background: #fafafa; }
    .room-avatar {
      width: 44px; height: 44px; background: #ddd; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 20px; color: white;
    }
    .room-info { flex: 1; display: flex; align-items: center; justify-content: space-between; width: 100%; }
    .room-name-wrapper { display: flex; flex-direction: column; gap: 4px; }
    .room-name { font-weight: bold; font-size: 15px; }
    .room-type { font-size: 11px; background: #eee; padding: 2px 6px; border-radius: 10px; color: #555; align-self: flex-start; }
    .room-unread-badge {
      background: #ff3b30; color: white; border-radius: 50%; padding: 2px 6px;
      font-size: 10px; font-weight: bold; min-width: 18px; height: 18px;
      display: flex; align-items: center; justify-content: center; margin-left: auto;
    }
    .btn-create {
      margin: 16px; padding: 12px; background: var(--line-green); color: white;
      border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 14px; text-align: center;
    }
    #view-chat { display: none; flex-direction: column; flex: 1; overflow: hidden; background: var(--chat-bg); }
    .message-area { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .msg { display: flex; flex-direction: column; max-width: 82%; }
    .msg-sender { font-size: 11px; color: rgba(255,255,255,0.95); margin-bottom: 3px; font-weight: bold; cursor: pointer; }
    .msg-sender:hover { text-decoration: underline; }
    .msg-row { display: flex; align-items: flex-end; gap: 6px; }
    .msg-avatar {
      width: 30px; height: 30px; border-radius: 50%; object-fit: cover;
      border: 1px solid rgba(255,255,255,0.35); flex-shrink: 0; cursor: pointer;
      transition: transform 0.12s, box-shadow 0.12s; background: #e2e8f0;
    }
    .msg-avatar:hover { transform: scale(1.08); box-shadow: 0 2px 6px rgba(0,0,0,0.22); }
    .msg-bubble { padding: 8px 12px; border-radius: 14px; font-size: 14px; line-height: 1.4; word-break: break-all; box-shadow: 0 1px 2px rgba(0,0,0,0.1); transition: box-shadow 0.25s, background-color 0.25s; }
    .msg.highlight-flash .msg-bubble { box-shadow: 0 0 0 3px #facc15, 0 4px 12px rgba(0,0,0,0.2); }
    .msg-reply-quote {
      border-left: 3px solid var(--line-green); background: rgba(0,0,0,0.06);
      border-radius: 6px; padding: 4px 8px; margin-bottom: 6px; font-size: 11px;
      cursor: pointer; max-width: 100%;
    }
    .msg.me .msg-reply-quote { border-left-color: #15803d; background: rgba(0,0,0,0.08); }
    .msg-reply-quote:hover { background: rgba(0,0,0,0.12); }
    .msg-reply-quote-sender { font-weight: bold; font-size: 10px; color: #0f172a; margin-bottom: 1px; }
    .msg-reply-quote-text { color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
    .msg-meta { font-size: 9px; color: rgba(255,255,255,0.88); flex-shrink: 0; display: flex; flex-direction: column; gap: 2px; align-items: flex-end; min-width: 34px; }
    .msg.other .msg-meta { align-items: flex-start; }
    .msg-reply-btn {
      background: rgba(255,255,255,0.22); color: #fff; border: 1px solid rgba(255,255,255,0.3);
      border-radius: 10px; padding: 1px 6px; font-size: 10px; font-weight: bold; cursor: pointer;
      line-height: 1.4; transition: background 0.12s;
    }
    .msg-reply-btn:hover { background: rgba(255,255,255,0.38); }
    .msg-read-status { color: #fef08a; font-size: 10px; font-weight: 700; text-align: right; text-shadow: 0 1px 2px rgba(0,0,0,0.38); letter-spacing: 0.01em; line-height: 1.2; }
    .msg-read-status.has-readers { cursor: pointer; }
    .msg-read-toast {
      position: fixed; bottom: 68px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.92); color: #fff; font-size: 11px; font-weight: 600;
      padding: 6px 12px; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.28);
      z-index: 950; pointer-events: none; max-width: 86vw; text-align: center;
    }
    .msg.me { align-self: flex-end; align-items: flex-end; }
    .msg.me .msg-sender { align-self: flex-end; }
    .msg.me .msg-row { flex-direction: row-reverse; }
    .msg.me .msg-bubble { background: #95ec69; color: #191919; border-top-right-radius: 2px; }
    .msg.other { align-self: flex-start; align-items: flex-start; }
    .msg.other .msg-sender { align-self: flex-start; }
    .msg.other .msg-row { flex-direction: row; }
    .msg.other .msg-bubble { background: #ffffff; color: #191919; border-top-left-radius: 2px; }
    .msg-bubble.has-image { padding: 6px; }
    .msg-image {
      display: block; max-width: 220px; max-height: 240px; width: auto; height: auto;
      border-radius: 10px; object-fit: cover; cursor: pointer; background: rgba(0,0,0,0.06);
    }
    .msg-text-with-image { margin-top: 6px; padding: 0 4px 2px; }
    .lobby-contacts-bar {
      padding: 8px 12px 10px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
    }
    .lobby-contacts-label {
      font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 6px;
    }
    .lobby-contacts-list {
      display: flex; gap: 10px; overflow-x: auto; padding-bottom: 2px;
    }
    .lobby-contact-item {
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      cursor: pointer; flex-shrink: 0; width: 52px; position: relative;
    }
    .lobby-contact-avatar-wrap {
      position: relative; width: 40px; height: 40px;
    }
    .lobby-contact-avatar {
      width: 40px; height: 40px; border-radius: 50%; object-fit: cover;
      border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.16); background: #e2e8f0;
      transition: transform 0.12s;
    }
    .lobby-contact-item:hover .lobby-contact-avatar { transform: scale(1.06); }
    .lobby-contact-online-dot {
      position: absolute; right: 0; bottom: 0; width: 10px; height: 10px;
      border-radius: 50%; background: #22c55e; border: 2px solid #fff;
    }
    .lobby-contact-name {
      font-size: 10px; color: #334155; font-weight: 600; max-width: 52px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;
    }
    .member-checklist {
      max-height: 165px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 6px;
      padding: 6px; display: flex; flex-direction: column; gap: 4px; background: #f8fafc;
    }
    .member-check-row {
      display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 6px;
      background: #fff; border: 1px solid #e2e8f0; cursor: pointer; font-size: 13px; overflow: hidden;
    }
    .member-check-row:hover { background: #f1f5f9; }
    .member-check-row input[type="checkbox"] {
      width: 18px !important; min-width: 18px; max-width: 18px;
      height: 18px !important; padding: 0 !important; margin: 0 !important;
      flex: 0 0 auto !important; accent-color: var(--line-green); cursor: pointer;
    }
    .member-check-row span {
      min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .member-check-avatar {
      width: 26px; height: 26px; border-radius: 50%; object-fit: cover; background: #e2e8f0; flex-shrink: 0;
    }
    .reply-preview-bar {
      display: none; align-items: center; gap: 10px; padding: 7px 12px;
      background: #f0fdf4; border-top: 1px solid #bbf7d0; border-left: 4px solid var(--line-green); flex-shrink: 0;
    }
    .reply-preview-bar.active { display: flex; }
    .reply-preview-info { flex: 1; min-width: 0; }
    .reply-preview-sender { font-size: 11px; font-weight: bold; color: #15803d; }
    .reply-preview-text { font-size: 12px; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .image-preview-bar {
      display: none; align-items: center; gap: 10px; padding: 8px 12px;
      background: #f8fafc; border-top: 1px solid #e2e8f0; flex-shrink: 0;
    }
    .image-preview-bar.active { display: flex; }
    .image-preview-thumb {
      width: 48px; height: 48px; border-radius: 6px; object-fit: cover;
      border: 1px solid #cbd5e1; background: #fff; flex-shrink: 0;
    }
    .image-preview-info { flex: 1; min-width: 0; font-size: 12px; color: #334155; }
    .image-preview-name { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .image-preview-hint { font-size: 10px; color: #64748b; }
    .btn-clear-image {
      background: #e2e8f0; color: #334155; border: none; border-radius: 50%;
      width: 26px; height: 26px; font-size: 13px; font-weight: bold; cursor: pointer; flex-shrink: 0;
    }
    .input-form {
      display: flex; align-items: center; padding: 8px; background: white; border-top: 1px solid #ddd; gap: 8px; flex-shrink: 0;
    }
    .input-form input[type="text"] {
      flex: 1; border: 1px solid #ccc; border-radius: 20px; padding: 10px 16px; font-size: 14px; outline: none;
    }
    .input-form input[type="text"]:focus { border-color: var(--line-green); }
    .btn-image-attach {
      background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 50%;
      width: 38px; height: 38px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0;
    }
    .btn-image-attach:hover { background: #e2e8f0; }
    .input-form button#btn-send {
      background: var(--line-green); color: white; border: none; border-radius: 50%;
      width: 40px; height: 40px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;
    }
    #view-settings { display: none; flex-direction: column; flex: 1; overflow-y: auto; padding: 16px; gap: 20px; }
    .setting-item { display: flex; flex-direction: column; gap: 6px; }
    .setting-item input:not([type="checkbox"]):not([type="file"]), .setting-item textarea {
      padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; outline: none; width: 100%;
    }
    .setting-item input:not([type="checkbox"]):focus { border-color: var(--line-green); }
    .btn-save { padding: 12px; background: var(--line-green); color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; width: 100%; font-size: 14px; }
    .modal {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      align-items: center; justify-content: center; padding: 16px; z-index: 1000;
    }
    .modal.active { display: flex; }
    .modal-content { background: white; border-radius: 8px; width: 100%; max-width: 340px; max-height: 90vh; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .modal-title { font-weight: bold; font-size: 16px; }
    .modal-btns { display: flex; gap: 8px; justify-content: flex-end; }
    .modal-btn { padding: 8px 16px; border-radius: 4px; border: none; font-size: 13px; cursor: pointer; font-weight: bold; }
    .modal-btn.cancel { background: #eee; color: #333; }
    .modal-btn.confirm { background: var(--line-green); color: white; }

    /* Discord-like 360p Low-Latency Video Call UI */
    .header-call-btn {
      display: none; align-items: center; gap: 4px; font-size: 12px; font-weight: bold;
      background: rgba(255,255,255,0.22); color: #fff; border: none; padding: 4px 10px;
      border-radius: 12px; cursor: pointer; transition: background 0.14s, transform 0.1s;
    }
    .header-call-btn:hover { background: rgba(255,255,255,0.34); }
    .header-call-btn.in-call { background: #23a55a; box-shadow: 0 0 0 1px rgba(255,255,255,0.35); }
    .room-call-banner {
      display: none; align-items: center; justify-content: space-between; gap: 8px;
      padding: 7px 12px; background: #1e1f22; color: #f2f3f5;
      border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; font-size: 12px;
    }
    .room-call-banner.active { display: flex; }
    .room-call-banner-info {
      display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600;
    }
    .room-call-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #23a55a; flex-shrink: 0;
      box-shadow: 0 0 6px #23a55a;
    }
    .room-call-banner-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .btn-call-join-mini {
      border: none; border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: bold;
      cursor: pointer; color: #fff; background: #23a55a;
    }
    .btn-call-join-mini.voice { background: #4e5058; }
    .btn-call-join-mini:hover { filter: brightness(1.1); }

    .video-call-stage {
      display: none; flex-direction: column; background: #1e1f22; color: #f2f3f5;
      border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;
      user-select: none;
    }
    .video-call-stage.active { display: flex; }
    .call-topbar {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 6px 10px; background: #18191c; font-size: 11px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .call-status-left {
      display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1;
      font-weight: 700; color: #e2e8f0;
    }
    .call-quality-badge {
      font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;
      background: rgba(35,165,90,0.18); color: #4ade80; border: 1px solid rgba(35,165,90,0.4);
      flex-shrink: 0;
    }
    .call-topbar-btns { display: flex; gap: 4px; flex-shrink: 0; }
    .call-mini-btn {
      background: #2b2d31; color: #dbdee1; border: none; border-radius: 5px;
      padding: 3px 8px; font-size: 11px; font-weight: 600; cursor: pointer;
    }
    .call-mini-btn:hover { background: #383a40; }

    .call-video-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
      gap: 6px; padding: 8px; max-height: 196px; overflow-y: auto; align-content: start;
      background: #1e1f22;
    }
    .call-video-grid.single-tile {
      grid-template-columns: minmax(0, 260px); justify-content: center;
    }
    .video-call-stage.expanded .call-video-grid {
      max-height: 48vh; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
    }
    .video-call-stage.expanded .call-video-grid.single-tile {
      grid-template-columns: minmax(0, 420px);
    }
    .video-call-stage.collapsed .call-video-grid { display: none; }

    .call-tile {
      position: relative; aspect-ratio: 16 / 9; background: #2b2d31; border-radius: 8px;
      overflow: hidden; border: 2px solid transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
    }
    .call-tile.speaking {
      border-color: #23a55a; box-shadow: 0 0 0 1px rgba(35,165,90,0.55);
    }
    .call-tile.focused {
      grid-column: 1 / -1; max-height: 210px;
    }
    .video-call-stage.expanded .call-tile.focused {
      max-height: 36vh;
    }
    .call-tile video {
      width: 100%; height: 100%; object-fit: cover; display: block; background: #111214;
    }
    .call-tile.is-local video { transform: scaleX(-1); }
    .call-tile.cam-off video { opacity: 0; pointer-events: none; }
    .call-avatar-fallback {
      position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
      flex-direction: column; gap: 4px; background: #2b2d31;
    }
    .call-tile.cam-off .call-avatar-fallback { display: flex; }
    .call-avatar-img {
      width: 46px; height: 46px; border-radius: 50%; object-fit: cover;
      border: 2px solid rgba(255,255,255,0.16); background: #383a40;
    }
    .call-tile-label {
      position: absolute; left: 6px; bottom: 6px; max-width: calc(100% - 12px);
      background: rgba(0,0,0,0.68); color: #fff; padding: 2px 7px; border-radius: 5px;
      font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;
    }
    .call-tile-cam-badge {
      position: absolute; right: 6px; top: 6px; background: rgba(0,0,0,0.65); color: #cbd5e1;
      font-size: 10px; padding: 1px 5px; border-radius: 4px; pointer-events: none;
    }

    .call-controls {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 7px 10px; background: #18191c; border-top: 1px solid rgba(255,255,255,0.06);
      flex-wrap: wrap;
    }
    .call-ctrl-btn {
      display: inline-flex; align-items: center; gap: 5px; border: none; border-radius: 18px;
      padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer;
      background: #2b2d31; color: #f2f3f5; transition: background 0.12s;
    }
    .call-ctrl-btn:hover { background: #383a40; }
    .call-ctrl-btn.off { background: #4e5058; color: #f87171; }
    .call-ctrl-btn.active-on { background: #23a55a; color: #fff; }
    .call-ctrl-btn.hangup { background: #ed4245; color: #fff; }
    .call-ctrl-btn.hangup:hover { background: #d83c3e; }
    .call-notice {
      display: none; padding: 4px 10px; background: #3b2d1f; color: #fde68a;
      font-size: 11px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);
    }
    .call-notice.active { display: block; }
  </style>
  <script async defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <div class="header">
    <button class="header-btn" id="btn-back" style="visibility: hidden;">&#10094; 戻る</button>
    <span id="title-text" style="flex: 1; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 8px;">We talks</span>
    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
      <button class="header-call-btn" id="btn-video-call" title="360p低遅延ビデオ通話">📹 通話</button>
      <button class="header-btn" id="btn-group-members" style="display: none; font-size: 12px; background: rgba(255,255,255,0.22); padding: 4px 9px; border-radius: 12px;" title="グループメンバー・招待">👥 メンバー</button>
      <button class="header-btn" id="btn-to-settings">&#9881;</button>
    </div>
  </div>

  <div id="view-auth" style="display: none; flex-direction: column; flex: 1; overflow-y: auto; padding: 20px 24px; align-items: stretch;">
    <div style="margin: auto 0; display: flex; flex-direction: column; gap: 14px;">
      <div style="text-align: center; margin-bottom: 6px;">
        <div style="font-size: 44px; margin-bottom: 6px;">💬</div>
        <h2 style="font-size: 24px; font-weight: bold; color: var(--line-green);">We talks</h2>
        <p style="font-size: 13px; color: #666; margin-top: 4px;">ログインまたは新規登録してください</p>
      </div>

      <div style="display: flex; background: #eee; border-radius: 8px; padding: 4px;">
        <button id="auth-tab-login" style="flex: 1; padding: 8px; border: none; background: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px;">ログイン</button>
        <button id="auth-tab-signup" style="flex: 1; padding: 8px; border: none; background: transparent; font-weight: bold; border-radius: 6px; cursor: pointer; color: #555; font-size: 13px;">新規登録</button>
      </div>

      <div class="setting-item">
        <label style="font-size: 12px; font-weight: bold; color: #555;">ユーザー名</label>
        <input type="text" id="auth-username" placeholder="ユーザー名を入力" autocomplete="username" />
      </div>

      <div class="setting-item">
        <label style="font-size: 12px; font-weight: bold; color: #555; margin-top: 4px;">パスワード (4文字以上)</label>
        <div style="position: relative; display: flex; align-items: center;">
          <input type="password" id="auth-password" placeholder="パスワードを入力" autocomplete="current-password" style="width: 100%; padding-right: 38px;" />
          <button type="button" id="btn-toggle-auth-pass" title="パスワードを表示/非表示" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; font-size: 15px; color: #64748b; padding: 4px;">👁️</button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
        <div id="auth-backend-status" style="font-size: 11px; color: #475569; font-weight: bold;">接続先: ☁️ Cloudflare (共有)</div>
        <div style="display: flex; gap: 6px;">
          <button type="button" id="auth-pick-cf" style="flex: 1; padding: 5px 8px; border: 1px solid #fdba74; border-radius: 6px; background: #fff7ed; color: #c2410c; font-weight: bold; font-size: 11px; cursor: pointer;">☁️ Cloudflare (共有)</button>
          <button type="button" id="auth-pick-internal" style="flex: 1; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; color: #334155; font-weight: bold; font-size: 11px; cursor: pointer;">🖥️ 内蔵サーバー</button>
        </div>
      </div>

      <div id="auth-error" style="color: #ff3b30; font-size: 12px; font-weight: bold; text-align: center; display: none; white-space: pre-wrap;"></div>

      <div id="auth-conn-helper" style="display: none; flex-direction: column; gap: 8px; background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #7c2d12;">
        <div id="auth-conn-target-text" style="word-break: break-all; font-weight: bold;">接続先を確認中...</div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button type="button" id="btn-auth-use-cf" style="flex: 1; min-width: 120px; padding: 7px 10px; border: none; border-radius: 6px; background: #f48120; color: white; font-weight: bold; font-size: 11px; cursor: pointer;">☁️ Cloudflareで再試行</button>
          <button type="button" id="btn-auth-use-internal" style="flex: 1; min-width: 120px; padding: 7px 10px; border: none; border-radius: 6px; background: #334155; color: white; font-weight: bold; font-size: 11px; cursor: pointer;">🖥️ 内蔵サーバーで再試行</button>
        </div>
      </div>

      <button class="btn-save" id="btn-auth-submit" style="margin-top: 6px;">ログイン</button>
    </div>
  </div>

  <div id="view-lobby">
    <div class="lobby-title">
      <span id="lobby-online-count-tag">● オンライン: 1人</span>
      <span style="display: inline-flex; align-items: center; gap: 4px;">
        <span id="lobby-username-tag">ゲスト</span>
        <span id="lobby-username-edit-btn" style="font-size: 11px; color: #06C755; cursor: pointer;" title="ユーザー名・プロフィールを編集">✏️</span>
      </span>
    </div>
    <div id="lobby-contacts-bar" class="lobby-contacts-bar" style="display: none;">
      <div class="lobby-contacts-label">👤 ユーザー (アイコンをタップして個人チャット)</div>
      <div id="lobby-contacts-list" class="lobby-contacts-list"></div>
    </div>
    <ul class="room-list" id="room-list-container"></ul>
    <button class="btn-create" id="btn-open-create-modal">＋ 新しいトークルームを作成</button>
  </div>

  <div id="view-chat">
    <div id="room-call-banner" class="room-call-banner">
      <div class="room-call-banner-info">
        <span class="room-call-dot"></span>
        <span id="room-call-banner-text">通話中</span>
      </div>
      <div class="room-call-banner-actions">
        <button type="button" id="btn-banner-join-video" class="btn-call-join-mini">📹 ビデオ参加</button>
        <button type="button" id="btn-banner-join-voice" class="btn-call-join-mini voice">🎙️ 音声参加</button>
      </div>
    </div>
    <div id="video-call-stage" class="video-call-stage">
      <div class="call-topbar">
        <div class="call-status-left">
          <span class="room-call-dot"></span>
          <span id="call-status-label">接続中...</span>
          <span class="call-quality-badge">360p 低遅延</span>
        </div>
        <div class="call-topbar-btns">
          <button type="button" id="btn-call-expand" class="call-mini-btn" title="画面サイズ切替">⛶ 拡大</button>
          <button type="button" id="btn-call-collapse" class="call-mini-btn" title="ビデオ欄を折りたたむ">▾ 最小化</button>
        </div>
      </div>
      <div id="call-video-grid" class="call-video-grid single-tile"></div>
      <div id="call-notice" class="call-notice"></div>
      <div class="call-controls">
        <button type="button" id="btn-call-cam" class="call-ctrl-btn active-on">📹 カメラ ON</button>
        <button type="button" id="btn-call-mic" class="call-ctrl-btn active-on">🎙️ マイク ON</button>
        <button type="button" id="btn-call-deafen" class="call-ctrl-btn">🔊 音声受信 ON</button>
        <button type="button" id="btn-call-leave" class="call-ctrl-btn hangup">📞 切断</button>
      </div>
    </div>
    <div class="message-area" id="message-container"></div>
    <div class="reply-preview-bar" id="reply-preview-bar">
      <div class="reply-preview-info">
        <div id="reply-preview-sender" class="reply-preview-sender">↩ 返信先</div>
        <div id="reply-preview-text" class="reply-preview-text"></div>
      </div>
      <button type="button" id="btn-clear-reply" class="btn-clear-image" title="返信をキャンセル">✕</button>
    </div>
    <div class="image-preview-bar" id="msg-image-preview-bar">
      <img id="msg-image-preview-thumb" class="image-preview-thumb" src="" alt="送信プレビュー" />
      <div class="image-preview-info">
        <div id="msg-image-preview-name" class="image-preview-name">画像を選択中</div>
        <div class="image-preview-hint">送信ボタンを押すと画像を送信します</div>
      </div>
      <button type="button" id="btn-clear-msg-image" class="btn-clear-image" title="画像をキャンセル">✕</button>
    </div>
    <div class="input-form">
      <input type="file" id="msg-image-file" accept="image/*" style="display: none;" />
      <button type="button" id="btn-image-attach" class="btn-image-attach" title="画像を送信">🖼️</button>
      <input type="text" id="msg-input" placeholder="メッセージを入力" autocomplete="off" />
      <button id="btn-send">&#10148;</button>
    </div>
  </div>

  <div id="view-settings" style="overflow-y: auto; max-height: calc(100vh - 120px); padding-bottom: 24px;">
    <div id="settings-active-backend-banner" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #1e293b; line-height: 1.5;">
      現在の保存先: <strong id="settings-active-backend-label">確認中...</strong>
    </div>

    <div style="padding-top: 4px;">
      <h3 style="font-size:14px; font-weight:bold; color:#333; margin-bottom:8px;">バックエンド接続プロバイダー</h3>
      
      <!-- Provider Tabs -->
      <div style="display: flex; gap: 6px; background: #eee; padding: 4px; border-radius: 8px; margin-bottom: 14px;">
        <button id="tab-provider-internal" type="button" style="flex: 1; padding: 6px 10px; border: none; background: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 11px; color: #333;">🖥️ 内蔵サーバー</button>
        <button id="tab-provider-cf" type="button" style="flex: 1; padding: 6px 10px; border: none; background: transparent; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 11px; color: #666;">☁️ Cloudflare Worker</button>
        <button id="tab-provider-supabase" type="button" style="flex: 1; padding: 6px 10px; border: none; background: transparent; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 11px; color: #666;">⚡ Supabase</button>
      </div>

      <!-- Cloudflare Worker Section -->
      <div id="section-cf-settings" style="display: none; flex-direction: column; gap: 10px; background: #fffaf5; border: 1px solid #ffd8b2; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h4 style="font-size:12px; font-weight: bold; color:#d96500; margin:0;">Cloudflare Worker & D1 設定</h4>
        </div>
        <p style="font-size:11px; color:#775533; margin:0; line-height: 1.4;">
          Cloudflare Workers 上で動くバックエンド API の URL を入力し、下の「保存して適用」を押すと、ユーザー名・パスワード・ルーム・履歴・画像が Cloudflare 側に保存されます。
        </p>

        <div class="setting-item">
          <label style="font-size: 11px; font-weight: bold; color: #555;">Cloudflare Worker URL</label>
          <div style="display: flex; gap: 6px; margin-top: 4px;">
            <input type="text" id="input-cf-url" placeholder="https://wetalks-backend.mozunbu0123.workers.dev" style="flex: 1; font-size: 11px;" />
            <button id="btn-cf-test" type="button" style="padding: 6px 12px; font-size: 11px; font-weight: bold; background: #f48120; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">接続テスト</button>
          </div>
          <div id="cf-test-result" style="font-size: 11px; font-weight: bold; margin-top: 4px; display: none;"></div>
        </div>

        <!-- Setup Guide Toggle -->
        <details style="background: white; border: 1px dashed #f48120; border-radius: 6px; padding: 8px; font-size: 11px; color: #444;">
          <summary style="cursor: pointer; font-weight: bold; color: #d96500;">📖 Cloudflare 側の設定手順・SQLコード</summary>
          <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px; line-height: 1.4;">
            <p style="margin: 0;"><b>1. D1 データベース作成</b>: Cloudflare Dash → Workers & Pages → D1 → 「wetalks-db」を作成</p>
            <p style="margin: 0;"><b>2. テーブル作成</b>: D1 コンソールで以下の SQL を実行：</p>
            <textarea id="cf-schema-sql" readonly style="width: 100%; height: 95px; font-family: monospace; font-size: 10px; background: #f8f9fa; border: 1px solid #ddd; padding: 4px; border-radius: 4px;">CREATE TABLE IF NOT EXISTS wetalks_users (username TEXT PRIMARY KEY, password_numeric TEXT NOT NULL DEFAULT '', password_hash TEXT DEFAULT '', token TEXT DEFAULT '', avatar_base64 TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS wetalks_rooms (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, members_json TEXT DEFAULT '', created_by TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS wetalks_messages (id TEXT PRIMARY KEY, room_id TEXT NOT NULL, sender TEXT NOT NULL, text TEXT NOT NULL, image_base64 TEXT DEFAULT '', reply_to_json TEXT DEFAULT '', read_by_json TEXT DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS wetalks_deleted_rooms (id TEXT PRIMARY KEY);</textarea>
            <button type="button" id="btn-copy-sql" style="align-self: flex-start; padding: 4px 8px; font-size: 10px; background: #eee; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">📋 SQL をコピー</button>
            <p style="margin: 0;"><b>3. Worker 更新</b>: プロジェクト内の <code>cloudflare/worker.js</code> を貼り付けてデプロイ</p>
            <p style="margin: 0;"><b>4. D1 バインド</b>: Worker 設定 → Variables → D1 Binding に Variable name <code>DB</code> として wetalks-db を設定</p>
          </div>
        </details>
      </div>

      <!-- Supabase Section -->
      <div id="section-supabase-settings" style="display: none; flex-direction: column; gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <h4 style="font-size:12px; font-weight: bold; color:#334155; margin:0;">Supabase 設定</h4>
        <p style="font-size:11px; color:#64748b; margin:0;">取得した「URL」と「anon key」を入力してください。</p>
        <div class="setting-item">
          <label style="font-size: 11px; font-weight: bold; color: #555;">Supabase URL</label>
          <input type="text" id="input-supabase-url" placeholder="https://xxxxxxxxxxxxxx.supabase.co" style="font-size: 11px;" />
        </div>
        <div class="setting-item" style="margin-top:4px;">
          <label style="font-size: 11px; font-weight: bold; color: #555;">Supabase anon key</label>
          <textarea id="input-supabase-key" rows="3" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." style="font-size: 10px; font-family: monospace;"></textarea>
        </div>
      </div>

      <!-- Internal Server Section -->
      <div id="section-internal-settings" style="display: none; flex-direction: column; gap: 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <h4 style="font-size:12px; font-weight: bold; color:#1e293b; margin:0;">内蔵 Express サーバー</h4>
        <p style="font-size:11px; color:#64748b; margin:0; line-height: 1.4;">
          本 WebOS 内蔵のバックエンド API (<code>/api/wetalks/*</code>) を使用します。Cloudflare に保存したい場合は上の「☁️ Cloudflare Worker」タブを選んで「保存して適用」を押してください。
        </p>
      </div>
    </div>

    <button class="btn-save" id="btn-save-settings" style="margin-top:4px;">保存して適用</button>

    <!-- Admin Storage Inspection & Management Dashboard -->
    <div style="border-top: 1px solid #ddd; padding-top: 14px; margin-top: 8px; display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
        <h4 style="font-size:13px; color:#0f172a; margin:0;">🛡️ 保存データ確認・管理 (管理者用)</h4>
        <span style="font-size:10px; color:#0369a1; background:#e0f2fe; padding:2px 8px; border-radius:4px; font-weight:bold;">画像10日自動削除</span>
      </div>

      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button type="button" id="btn-admin-inspect-active" style="flex: 1; min-width: 110px; padding: 7px 10px; font-size: 11px; font-weight: bold; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer;">🔄 現在の保存先を確認</button>
        <button type="button" id="btn-admin-inspect-cf" style="flex: 1; min-width: 120px; padding: 7px 10px; font-size: 11px; font-weight: bold; background: #f48120; color: white; border: none; border-radius: 6px; cursor: pointer;">☁️ Cloudflare を直接確認</button>
        <button type="button" id="btn-admin-prune-images" style="width: 100%; padding: 7px 10px; font-size: 11px; font-weight: bold; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer;">🧹 10日経過した画像を今すぐチェック・削除</button>
      </div>

      <div id="admin-storage-status" style="font-size: 11px; padding: 8px 10px; border-radius: 6px; background: #f8fafc; border: 1px solid #cbd5e1; color: #334155; line-height: 1.5;">
        データを確認中...
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; text-align: center;">
          <div style="font-size: 10px; color: #64748b;">ユーザー</div>
          <div id="admin-stat-users" style="font-size: 15px; font-weight: bold; color: #0f172a;">-</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; text-align: center;">
          <div style="font-size: 10px; color: #64748b;">ルーム</div>
          <div id="admin-stat-rooms" style="font-size: 15px; font-weight: bold; color: #0f172a;">-</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; text-align: center;">
          <div style="font-size: 10px; color: #64748b;">履歴数</div>
          <div id="admin-stat-messages" style="font-size: 15px; font-weight: bold; color: #0f172a;">-</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; text-align: center;">
          <div style="font-size: 10px; color: #64748b;">保存画像</div>
          <div id="admin-stat-images" style="font-size: 15px; font-weight: bold; color: #0284c7;">-</div>
        </div>
      </div>

      <div style="display: flex; gap: 4px; background: #e2e8f0; padding: 3px; border-radius: 6px;">
        <button type="button" id="tab-admin-users" style="flex: 1; padding: 6px; border: none; border-radius: 4px; font-size: 11px; font-weight: bold; background: white; color: #0f172a; cursor: pointer;">👤 ユーザー・PW</button>
        <button type="button" id="tab-admin-rooms" style="flex: 1; padding: 6px; border: none; border-radius: 4px; font-size: 11px; font-weight: bold; background: transparent; color: #475569; cursor: pointer;">💬 ルーム</button>
        <button type="button" id="tab-admin-messages" style="flex: 1; padding: 6px; border: none; border-radius: 4px; font-size: 11px; font-weight: bold; background: transparent; color: #475569; cursor: pointer;">🖼️ 履歴・画像</button>
      </div>

      <div id="admin-panel-users" style="display: flex; flex-direction: column; gap: 6px;">
        <ul id="admin-user-list" style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 6px;"></ul>
      </div>

      <div id="admin-panel-rooms" style="display: none; flex-direction: column; gap: 6px;">
        <ul id="settings-room-list" style="list-style:none; padding:0; display:flex; flex-direction:column; gap:8px;"></ul>
      </div>

      <div id="admin-panel-messages" style="display: none; flex-direction: column; gap: 6px;">
        <ul id="admin-message-list" style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 6px;"></ul>
      </div>
    </div>
  </div>

  <div class="modal" id="modal-create-room">
    <div class="modal-content">
      <div class="modal-title">新しいトークルームを作成</div>
      <div class="setting-item">
        <label>タイプ</label>
        <select id="select-new-room-type" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
          <option value="group" selected>グループ</option>
          <option value="direct">1対1 (個人チャット)</option>
        </select>
      </div>
      <div class="setting-item" id="container-room-name" style="display: flex;">
        <label>グループ名</label>
        <input type="text" id="input-new-room-name" placeholder="例: 雑談グループ" autocomplete="off" />
      </div>
      <div class="setting-item" id="container-group-members" style="display: flex;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; font-weight: bold; color: #334155;">グループに入れる人を選択</label>
          <button type="button" id="btn-create-select-all" style="background: none; border: none; color: var(--line-green); font-size: 11px; font-weight: bold; cursor: pointer;">全員選択</button>
        </div>
        <div id="create-group-members-list" class="member-checklist"></div>
        <span style="font-size: 10px; color: #64748b;">※ 選ばれたメンバーとあなたのみルームが見えます</span>
      </div>
      <div class="setting-item" id="container-direct-target" style="display: none;">
        <label>話す相手を選択</label>
        <select id="select-direct-target" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px;"></select>
      </div>
      <div id="create-room-error" style="color: #ff3b30; font-size: 12px; font-weight: bold; display: none;"></div>
      <div class="modal-btns">
        <button class="modal-btn cancel" id="btn-create-cancel">キャンセル</button>
        <button class="modal-btn confirm" id="btn-create-confirm">作成</button>
      </div>
    </div>
  </div>

  <div class="modal" id="modal-user-action" style="z-index: 1150;">
    <div class="modal-content" style="max-width: 300px; align-items: center; text-align: center;">
      <img id="user-action-avatar" src="" alt="" style="width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2px solid var(--line-green); background: #e2e8f0;" />
      <div>
        <div id="user-action-name" style="font-size: 17px; font-weight: bold; color: #0f172a;"></div>
        <div id="user-action-status" style="font-size: 11px; color: #64748b; margin-top: 2px;"></div>
      </div>
      <button type="button" id="btn-start-direct-chat" class="btn-save" style="border-radius: 20px; padding: 11px 16px;">💬 個人チャットをする</button>
      <button type="button" id="btn-user-action-close" class="modal-btn cancel" style="width: 100%;">閉じる</button>
    </div>
  </div>

  <div class="modal" id="modal-group-members" style="z-index: 1100;">
    <div class="modal-content" style="max-width: 340px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="modal-title" id="group-members-modal-title">グループメンバー</div>
        <button type="button" id="btn-group-members-close" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">✕</button>
      </div>
      <div style="font-size: 11px; color: #64748b;">※ 参加者のアイコンをタップすると個人チャットができます</div>
      <div id="group-current-members-list" class="member-checklist" style="max-height: 140px;"></div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: 12px; font-weight: bold; color: #0f172a;">➕ 新しい人をグループに招待</div>
        <div id="group-invite-candidates-list" class="member-checklist" style="max-height: 135px;"></div>
        <div id="group-invite-status" style="font-size: 11px; font-weight: bold; display: none;"></div>
        <button type="button" id="btn-group-invite-confirm" class="btn-save" style="padding: 9px 12px;">選択したメンバーを招待する</button>
      </div>
    </div>
  </div>

  <div class="modal" id="modal-passcode">
    <div class="modal-content">
      <div class="modal-title">管理者認証</div>
      <div class="setting-item">
        <label>設定を開くには管理者パスキーを入力してください</label>
        <input type="password" id="input-passcode" placeholder="パスキーを入力" style="margin-top: 8px;" />
        <div id="passcode-error" style="color: #ff3333; font-size: 12px; margin-top: 6px; display: none; font-weight: bold;">パスキーが一致しません。</div>
      </div>
      <div class="modal-btns">
        <button class="modal-btn cancel" id="btn-passcode-cancel">キャンセル</button>
        <button class="modal-btn confirm" id="btn-passcode-confirm">確認</button>
      </div>
    </div>
  </div>

  <div class="modal" id="modal-change-username">
    <div class="modal-content">
      <div class="modal-title">プロフィールの編集</div>
      <div class="setting-item">
        <label>ユーザー名</label>
        <input type="text" id="input-new-username" placeholder="新しいユーザー名を入力" style="margin-top: 8px;" autocomplete="off" />
        <span style="font-size: 11px; color: #64748b;">※ 他のユーザーが登録済みの名前には変更できません</span>
      </div>
      <div id="username-change-error" style="color: #ff3b30; font-size: 12px; font-weight: bold; display: none;"></div>
      <div class="setting-item" style="margin-top: 4px;">
        <label>プロフィール画像</label>
        <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px;">
          <img id="profile-avatar-preview" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; background: #ddd; border: 1px solid #ccc;" src="" />
          <input type="file" id="profile-avatar-file" accept="image/*" style="font-size: 11px;" />
        </div>
      </div>
      <div class="modal-btns" style="margin-top: 12px;">
        <button class="modal-btn cancel" id="btn-username-cancel">キャンセル</button>
        <button class="modal-btn confirm" id="btn-username-confirm">保存</button>
      </div>
      <div style="border-top: 1px solid #eee; margin-top: 14px; padding-top: 14px;">
        <button class="modal-btn" id="btn-logout" style="background: #ff3b30; color: white; width: 100%; padding: 10px; border-radius: 4px; border: none; font-weight: bold; cursor: pointer;">ログアウト</button>
      </div>
    </div>
  </div>

  <div class="modal" id="modal-admin-room-chat" style="z-index: 1120;">
    <div class="modal-content" style="max-width: 440px; width: 100%; max-height: 86vh; display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <div style="min-width: 0; flex: 1;">
          <div class="modal-title" id="admin-room-chat-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">ルーム内チャット閲覧</div>
          <div id="admin-room-chat-members" style="font-size: 11px; color: #64748b; margin-top: 2px; word-break: break-word;"></div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <button type="button" id="btn-admin-room-chat-refresh" style="background: #e2e8f0; color: #0f172a; border: none; border-radius: 6px; padding: 5px 9px; font-size: 11px; font-weight: bold; cursor: pointer;">🔄 更新</button>
          <button type="button" id="btn-admin-room-chat-close" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">✕</button>
        </div>
      </div>
      <div id="admin-room-chat-list" style="flex: 1; min-height: 180px; max-height: 56vh; overflow-y: auto; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;"></div>
    </div>
  </div>

  <div class="modal" id="modal-image-viewer" style="background: rgba(0,0,0,0.85); z-index: 1200;">
    <div style="position: relative; max-width: 92%; max-height: 90%; display: flex; flex-direction: column; align-items: center; gap: 10px;">
      <img id="image-viewer-img" src="" alt="拡大画像" style="max-width: 100%; max-height: 78vh; border-radius: 8px; object-fit: contain; background: #111;" />
      <button type="button" id="btn-close-image-viewer" style="background: white; color: #111; border: none; padding: 8px 18px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">閉じる</button>
    </div>
  </div>

  <div class="modal" id="modal-confirm-action" style="z-index: 1250;">
    <div class="modal-content" style="max-width: 320px;">
      <div class="modal-title" id="confirm-action-title">削除の確認</div>
      <div id="confirm-action-message" style="font-size: 13px; color: #334155; line-height: 1.5; white-space: pre-wrap;"></div>
      <div class="modal-btns" style="margin-top: 8px;">
        <button type="button" class="modal-btn cancel" id="btn-confirm-action-cancel">キャンセル</button>
        <button type="button" class="modal-btn" id="btn-confirm-action-ok" style="background: #ef4444; color: white;">削除する</button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      'use strict';

      let localStorage;
      try {
        let storageCandidate = null;
        try {
          if (window.parent && window.parent !== window && window.parent.localStorage) {
            window.parent.localStorage.setItem('__wetalks_test__', '1');
            window.parent.localStorage.removeItem('__wetalks_test__');
            storageCandidate = window.parent.localStorage;
            // Migrate any existing iframe-scoped wetalks_* keys into parent localStorage once
            try {
              if (window.localStorage) {
                for (let i = 0; i < window.localStorage.length; i++) {
                  const k = window.localStorage.key(i);
                  if (k && k.startsWith('wetalks_') && storageCandidate.getItem(k) === null) {
                    const v = window.localStorage.getItem(k);
                    if (v !== null) storageCandidate.setItem(k, v);
                  }
                }
              }
            } catch (migErr) {}
          }
        } catch (parentErr) {}
        if (!storageCandidate) {
          window.localStorage.getItem('test');
          storageCandidate = window.localStorage;
        }
        localStorage = storageCandidate;
      } catch (e) {
        localStorage = {
          _data: {},
          getItem: function(k) { return this._data[k] !== undefined ? this._data[k] : null; },
          setItem: function(k, v) { this._data[k] = String(v); },
          removeItem: function(k) { delete this._data[k]; },
          clear: function() { this._data = {}; }
        };
      }

      let sessionStorage;
      try {
        window.sessionStorage.getItem('test');
        sessionStorage = window.sessionStorage;
      } catch (e) {
        sessionStorage = {
          _data: {},
          getItem: function(k) { return this._data[k] !== undefined ? this._data[k] : null; },
          setItem: function(k, v) { this._data[k] = String(v); },
          removeItem: function(k) { delete this._data[k]; },
          clear: function() { this._data = {}; }
        };
      }

      const DB_KEY = 'wetalks_local_db_v3';
      const DELETED_ROOMS_KEY = 'wetalks_deleted_rooms_v1';
      const LEGACY_DEFAULT_ROOM_IDS = ['room-general', 'room-random', 'room-announcements'];
      const defaultRoomsList = [];

      // One-time cleanup of legacy initial rooms
      try {
        if (!localStorage.getItem('wetalks_migrated_no_default_rooms_v1')) {
          const rawDb = localStorage.getItem(DB_KEY);
          if (rawDb) {
            const parsedDb = JSON.parse(rawDb);
            if (parsedDb && Array.isArray(parsedDb.rooms)) {
              parsedDb.rooms = parsedDb.rooms.filter(r => r && r.id && !LEGACY_DEFAULT_ROOM_IDS.includes(r.id));
              localStorage.setItem(DB_KEY, JSON.stringify(parsedDb));
            }
          }
          localStorage.setItem('wetalks_migrated_no_default_rooms_v1', 'true');
        }
      } catch(e) {}

      function getDeletedRoomIds() {
        try {
          const raw = localStorage.getItem(DELETED_ROOMS_KEY);
          if (raw) return JSON.parse(raw);
        } catch(e) {}
        return [];
      }

      function addDeletedRoomId(id) {
        try {
          const list = getDeletedRoomIds();
          if (!list.includes(id)) {
            list.push(id);
            localStorage.setItem(DELETED_ROOMS_KEY, JSON.stringify(list));
          }
        } catch(e) {}
      }

      function removeDeletedRoomId(id) {
        try {
          let list = getDeletedRoomIds();
          list = list.filter(item => item !== id);
          localStorage.setItem(DELETED_ROOMS_KEY, JSON.stringify(list));
        } catch(e) {}
      }

      const IMAGE_RETENTION_DAYS = 10;
      const IMAGE_RETENTION_MS = IMAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

      function pruneExpiredMessagesArray(msgs) {
        if (!Array.isArray(msgs)) return false;
        const now = Date.now();
        let changed = false;
        msgs.forEach(m => {
          if (m && m.image_base64) {
            const createdMs = Date.parse(m.created_at || '');
            if (!isNaN(createdMs) && now - createdMs >= IMAGE_RETENTION_MS) {
              delete m.image_base64;
              m.image_expired = true;
              changed = true;
            }
          }
        });
        return changed;
      }

      function getLocalDB() {
        const raw = localStorage.getItem(DB_KEY);
        const deletedIds = getDeletedRoomIds();
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            let changed = false;
            if (!parsed.rooms || !Array.isArray(parsed.rooms)) {
              parsed.rooms = [];
              changed = true;
            } else {
              parsed.rooms = parsed.rooms.filter(r => r && r.id && !deletedIds.includes(r.id));
            }
            if (!parsed.messages) parsed.messages = {};
            Object.keys(parsed.messages).forEach(rId => {
              if (pruneExpiredMessagesArray(parsed.messages[rId])) {
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem(DB_KEY, JSON.stringify(parsed));
            }
            return parsed;
          } catch(e) {}
        }
        const defaultDB = { rooms: [], messages: {} };
        localStorage.setItem(DB_KEY, JSON.stringify(defaultDB));
        return defaultDB;
      }

      const NOTIFIED_IDS_KEY = 'wetalks_notified_msg_ids_v1';
      const ACTIVE_VIEWING_ROOM_KEY = 'wetalks_active_viewing_room';
      const PENDING_OPEN_ROOM_KEY = 'wetalks_pending_open_room';
      const seenMessageIds = new Set();

      function getSharedNotifiedSet() {
        try {
          const raw = localStorage.getItem(NOTIFIED_IDS_KEY);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) return new Set(arr.map(String));
          }
        } catch (e) {}
        return new Set();
      }

      function markMessageNotified(msgId) {
        if (!msgId) return;
        const idStr = String(msgId);
        seenMessageIds.add(idStr);
        try {
          const set = getSharedNotifiedSet();
          if (!set.has(idStr)) {
            set.add(idStr);
            const arr = Array.from(set);
            const trimmed = arr.length > 400 ? arr.slice(arr.length - 400) : arr;
            localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(trimmed));
          }
        } catch (e) {}
      }

      function isMessageAlreadySeen(msgId) {
        if (!msgId) return true;
        const idStr = String(msgId);
        if (seenMessageIds.has(idStr)) return true;
        const shared = getSharedNotifiedSet();
        if (shared.has(idStr)) {
          seenMessageIds.add(idStr);
          return true;
        }
        return false;
      }

      try {
        const db = getLocalDB();
        if (db && db.messages) {
          Object.keys(db.messages).forEach(roomId => {
            db.messages[roomId].forEach(m => {
              if (m && m.id) markMessageNotified(m.id);
            });
          });
        }
      } catch (e) {}

      function resolveRoomDisplayName(roomId, fallbackName) {
        try {
          const db = getLocalDB();
          const rooms = (db && db.rooms) || [];
          const found = rooms.find(r => r && r.id === roomId);
          if (found && found.name) {
            if (found.type === 'direct') {
              const myName = getSessionUser();
              const parts = found.name.replace(/@/g, '').split(' & ');
              if (parts.length === 2) {
                return parts[0] === myName ? parts[1] : parts[0];
              }
            }
            return found.name;
          }
        } catch (e) {}
        return fallbackName || '';
      }

      function checkAndNotifyNewMessage(msg, roomName) {
        if (!msg || !msg.id) return;
        if (isMessageAlreadySeen(msg.id)) return;
        markMessageNotified(msg.id);
        if (msg.sender !== getSessionUser()) {
          const targetRoomId = msg.room_id || activeRoomId || '';
          const resolvedName = roomName || resolveRoomDisplayName(targetRoomId, '');
          window.parent.postMessage({
            type: 'WETALKS_NEW_MESSAGE',
            payload: {
              id: String(msg.id),
              sender: msg.sender,
              text: msg.text || ((msg.image_base64 || msg.has_image) ? '📷 画像を送信しました' : ''),
              roomId: targetRoomId,
              roomName: resolvedName
            }
          }, '*');
        }
      }

      function saveLocalDB(db) {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
      }

      const SESSION_USER_KEY = 'wetalks_session_user';
      let currentIp = "unknown_ip";
      let authMode = 'login'; // 'login' or 'signup'
      let selectedAvatarBase64 = null;
      let cachedUsers = [];
      let hasSupabaseUsersTableError = false;
      let hasSupabaseRoomsTableError = false;
      let hasSupabaseMessagesTableError = false;

      function withTimeout(promise, ms = 1500) {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), ms))
        ]);
      }

      function getBackendType() {
        const saved = localStorage.getItem('wetalks_backend_type_v2') || localStorage.getItem('wetalks_backend_type');
        if (saved) return saved;
        return 'cloudflare';
      }

      function getClientId() {
        let cid = sessionStorage.getItem('wetalks_client_id');
        if (!cid) {
          cid = 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
          sessionStorage.setItem('wetalks_client_id', cid);
        }
        return cid;
      }

      const AUTH_TOKEN_KEY = 'wetalks_auth_token';

      function getAuthToken() {
        return sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY) || '';
      }

      function setAuthSession(username, token) {
        if (username) {
          localStorage.setItem('wetalks_logged_in_user', username);
          sessionStorage.setItem(SESSION_USER_KEY, username);
        }
        if (token) {
          localStorage.setItem(AUTH_TOKEN_KEY, token);
          sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        }
        try {
          if (internalWs && internalWs.readyState === WebSocket.OPEN) {
            internalWs.send(JSON.stringify({ type: 'wetalks_subscribe', username: username || getSessionUser() }));
          } else {
            connectInternalWetalksWs();
          }
        } catch(e) {}
      }

      function clearAuthSession() {
        sessionStorage.removeItem(SESSION_USER_KEY);
        localStorage.removeItem('wetalks_logged_in_user');
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }

      let serverOnlineCount = 1;
      let supabaseOnlineCount = 1;
      let serverRoomMembers = [];
      let serverOnlineUsers = [];
      let allRoomsCache = [];
      let parentWindowActive = true;
      let internalWs = null;

      function getAvatarDataUri(username) {
        const av = getUserAvatar(username);
        if (av) return av;
        const ch = (String(username || '?').charAt(0) || '?').toUpperCase();
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23cbd5e1"/><text x="20" y="25" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23334155" text-anchor="middle">' + encodeURIComponent(ch) + '</text></svg>';
      }

      function isUserInRoom(room, username) {
        if (!room || !username || username === 'ゲスト') return false;
        if (Array.isArray(room.members)) {
          return room.members.includes(username);
        }
        if (room.type === 'direct' && room.name) {
          const parts = String(room.name).replace(/@/g, '').split(' & ');
          return parts.length === 2 && (parts[0] === username || parts[1] === username);
        }
        return false;
      }

      const DEFAULT_CF_URL = 'https://wetalks-backend.mozunbu0123.workers.dev';

      function normalizeCloudflareUrl(raw) {
        let url = String(raw || '').trim();
        if (!url || url === 'null' || url === 'undefined') return DEFAULT_CF_URL;
        if (!/^https?:[/][/]/i.test(url)) {
          while (url.startsWith('/')) url = url.slice(1);
          url = 'https://' + url;
        }
        url = url.replace(/[/]api[/]wetalks.*$/i, '');
        while (url.endsWith('/')) url = url.slice(0, -1);
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return DEFAULT_CF_URL;
          let path = parsed.pathname || '';
          while (path.endsWith('/')) path = path.slice(0, -1);
          return parsed.origin + (path ? path : '');
        } catch (e) {
          return DEFAULT_CF_URL;
        }
      }

      function getCloudflareUrl() {
        return normalizeCloudflareUrl(localStorage.getItem('wetalks_cloudflare_url'));
      }

      function resolveInternalOrigin() {
        let baseOrigin = '';
        try {
          if (window.parent && window.parent.location && window.parent.location.origin && window.parent.location.origin !== 'null') {
            baseOrigin = window.parent.location.origin;
          }
        } catch(e) {}
        if (!baseOrigin) {
          try {
            const savedOrigin = localStorage.getItem('webos_app_origin');
            if (savedOrigin && savedOrigin !== 'null') baseOrigin = savedOrigin;
          } catch(e) {}
        }
        if (!baseOrigin) {
          try {
            if (window.location && window.location.origin && window.location.origin !== 'null') {
              baseOrigin = window.location.origin;
            }
          } catch(e) {}
        }
        if (!baseOrigin) {
          try {
            if (document.referrer && document.referrer.startsWith('http')) {
              baseOrigin = new URL(document.referrer).origin;
            }
          } catch(e) {}
        }
        return baseOrigin;
      }

      function buildApiUrl(endpoint, overrideBackend = null) {
        const backend = overrideBackend || getBackendType();
        if (backend === 'cloudflare') {
          const cfUrl = getCloudflareUrl();
          if (cfUrl) return cfUrl + endpoint;
        }
        if (endpoint.startsWith('/')) {
          const baseOrigin = resolveInternalOrigin();
          return baseOrigin ? (baseOrigin + endpoint) : endpoint;
        }
        return endpoint;
      }

      async function callServerAPIWithStatus(endpoint, method = 'GET', body = null, optionsOverride = {}) {
        const timeoutMs = typeof optionsOverride.timeoutMs === 'number' ? optionsOverride.timeoutMs : 15000;
        const targetUrl = buildApiUrl(endpoint, optionsOverride.backend || null);
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        let didTimeout = false;
        const timeoutId = controller ? setTimeout(() => {
          didTimeout = true;
          try { controller.abort(); } catch (err) {}
        }, timeoutMs) : null;
        try {
          const headers = {
            'Content-Type': 'application/json'
          };
          const token = getAuthToken();
          if (token && !optionsOverride.skipAuth) {
            headers['Authorization'] = 'Bearer ' + token;
          }
          const options = {
            method: method,
            signal: controller ? controller.signal : undefined,
            headers: headers
          };
          if (body !== null && body !== undefined && method !== 'GET' && method !== 'HEAD') {
            options.body = JSON.stringify(body);
          }
          const res = await fetch(targetUrl, options);
          if (timeoutId) clearTimeout(timeoutId);
          let data = null;
          try {
            data = await res.json();
          } catch(e) {}
          return { ok: res.ok, status: res.status, data: data, targetUrl: targetUrl };
        } catch (e) {
          if (timeoutId) clearTimeout(timeoutId);
          return {
            ok: false,
            status: 0,
            data: null,
            targetUrl: targetUrl,
            timedOut: didTimeout || (e && e.name === 'AbortError'),
            errorMessage: (e && e.message) ? String(e.message) : 'Network error'
          };
        }
      }

      async function callServerAPI(endpoint, method = 'GET', body = null) {
        const result = await callServerAPIWithStatus(endpoint, method, body);
        if (!result.ok) {
          return null;
        }
        return result.data;
      }

      async function loadCachedUsers() {
        // Load from local storage immediately first
        try {
          const localStored = JSON.parse(localStorage.getItem('wetalks_registered_users') || localStorage.getItem('wetalks_accounts_db') || '[]');
          if (localStored && localStored.length > 0) {
            cachedUsers = localStored;
          }
        } catch(e) {}

        const backend = getBackendType();
        if (backend !== 'supabase' || !supabaseClient || hasSupabaseUsersTableError) {
          try {
            const apiUsers = await callServerAPI('/api/wetalks/users');
            const userList = Array.isArray(apiUsers) ? apiUsers : (apiUsers && Array.isArray(apiUsers.users) ? apiUsers.users : []);
            if (userList.length > 0) {
              cachedUsers = userList.map(u => ({
                username: u.username,
                password: u.password_numeric ?? u.password,
                avatar: u.avatar_base64 || u.avatar
              }));
            }
          } catch(e) {}
          return;
        }
        try {
          const res = await withTimeout(supabaseClient.from('wetalks_users').select('*'), 1500);
          const data = res.data;
          const error = res.error;
          if (data && !error && data.length > 0) {
            cachedUsers = data.map(u => ({
              username: u.username,
              password: u.password_numeric ?? u.password,
              avatar: u.avatar_base64
            }));
          } else {
            if (error && (error.message && (error.message.includes("Could not find the table") || error.code === '42P01' || error.message.includes("schema cache")))) {
              hasSupabaseUsersTableError = true;
            }
            const apiUsers = await callServerAPI('/api/wetalks/users');
            const userList = Array.isArray(apiUsers) ? apiUsers : (apiUsers && Array.isArray(apiUsers.users) ? apiUsers.users : []);
            if (userList.length > 0) {
              cachedUsers = userList.map(u => ({
                username: u.username,
                password: u.password_numeric ?? u.password,
                avatar: u.avatar_base64 || u.avatar
              }));
            }
          }
        } catch(e) {
          hasSupabaseUsersTableError = true;
          try {
            const apiUsers = await callServerAPI('/api/wetalks/users');
            const userList = Array.isArray(apiUsers) ? apiUsers : (apiUsers && Array.isArray(apiUsers.users) ? apiUsers.users : []);
            if (userList.length > 0) {
              cachedUsers = userList.map(u => ({
                username: u.username,
                password: u.password_numeric ?? u.password,
                avatar: u.avatar_base64 || u.avatar
              }));
            }
          } catch(err) {}
        }
      }

      async function fetchUserIpAndInitName() {
        const token = getAuthToken();
        const loggedIn = localStorage.getItem('wetalks_logged_in_user');
        const backend = getBackendType();

        // Fetch IP in background
        fetch("https://api.ipify.org?format=json")
          .then(res => res.json())
          .then(data => { if (data && data.ip) currentIp = data.ip; })
          .catch(e => {});

        if (backend === 'internal' || backend === 'cloudflare') {
          if (!token && (!loggedIn || loggedIn === 'ゲスト')) {
            clearAuthSession();
            switchView('auth');
            return;
          }
          const meRes = token
            ? await callServerAPIWithStatus('/api/wetalks/auth/me', 'GET')
            : { ok: false, status: 401, data: null };
          if (meRes.ok && meRes.data && meRes.data.user && meRes.data.user.username) {
            setAuthSession(meRes.data.user.username, token);
            const pendingRoomId = localStorage.getItem(PENDING_OPEN_ROOM_KEY);
            if (pendingRoomId) {
              localStorage.removeItem(PENDING_OPEN_ROOM_KEY);
              activeRoomId = pendingRoomId;
              switchView('chat');
            } else {
              switchView('lobby');
            }
            loadCachedUsers().then(() => syncServerPresence()).catch(() => {});
          } else if (meRes.status === 401) {
            clearAuthSession();
            switchView('auth');
            if (loggedIn && loggedIn !== 'ゲスト' && DOM.authError) {
              DOM.authError.textContent = 'サーバー更新またはセッション期限切れのため、再度ログインしてください。';
              DOM.authError.style.display = 'block';
            }
          } else if ((meRes.status === 404 || meRes.status === 0) && loggedIn && loggedIn !== 'ゲスト') {
            sessionStorage.setItem(SESSION_USER_KEY, loggedIn);
            const pendingRoomId = localStorage.getItem(PENDING_OPEN_ROOM_KEY);
            if (pendingRoomId) {
              localStorage.removeItem(PENDING_OPEN_ROOM_KEY);
              activeRoomId = pendingRoomId;
              switchView('chat');
            } else {
              switchView('lobby');
            }
            loadCachedUsers().then(() => syncServerPresence()).catch(() => {});
          } else {
            clearAuthSession();
            switchView('auth');
          }
          return;
        }

        if (!loggedIn || loggedIn === 'ゲスト') {
          clearAuthSession();
          switchView('auth');
          return;
        }

        sessionStorage.setItem(SESSION_USER_KEY, loggedIn);
        const pendingRoomId = localStorage.getItem(PENDING_OPEN_ROOM_KEY);
        if (pendingRoomId) {
          localStorage.removeItem(PENDING_OPEN_ROOM_KEY);
          activeRoomId = pendingRoomId;
          switchView('chat');
        } else {
          switchView('lobby');
        }
        loadCachedUsers().catch(() => {});
      }

      function getSessionUser() {
        return sessionStorage.getItem(SESSION_USER_KEY) || "ゲスト";
      }

      function getUserAvatar(username) {
        try {
          const found = cachedUsers.find(u => u.username === username);
          if (found && found.avatar) return found.avatar;
        } catch(e) {}
        return '';
      }

      let currentView = 'lobby';
      let activeRoomId = null;
      let renderedChatRoomId = null;
      let renderMessagesSeq = 0;
      let loadRoomSeq = 0;
      let supabaseClient = null;
      let msgChannel = null;
      let presenceChannel = null;
      let roomPresenceMembers = [];

      const ACTIVE_USERS_KEY = 'wetalks_active_users_in_rooms_v1';
      const READ_MAP_KEY = 'wetalks_read_messages_map_v1';
      let localPresenceInterval = null;

      const READ_PING_KEY = 'wetalks_read_ping_v1';
      let wetalksBroadcast = null;
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          wetalksBroadcast = new BroadcastChannel('wetalks_realtime_sync');
        }
      } catch(e) {}

      function emitRealtimeSync(eventType, roomId) {
        const payload = { type: eventType, roomId: String(roomId || ''), user: getSessionUser(), ts: Date.now() };
        try {
          if (wetalksBroadcast) wetalksBroadcast.postMessage(payload);
        } catch(e) {}
        try {
          localStorage.setItem(READ_PING_KEY, JSON.stringify(payload));
        } catch(e) {}
      }

      let readToastTimer = null;
      function showReadReadersBanner(text) {
        if (!text) return;
        let el = document.getElementById('wetalks-read-toast');
        if (!el) {
          el = document.createElement('div');
          el.id = 'wetalks-read-toast';
          el.className = 'msg-read-toast';
          document.body.appendChild(el);
        }
        el.textContent = text;
        el.style.display = 'block';
        if (readToastTimer) clearTimeout(readToastTimer);
        readToastTimer = setTimeout(() => {
          if (el) el.style.display = 'none';
        }, 2600);
      }

      function parseReadBy(msg) {
        if (!msg) return [];
        const senderName = String(msg.sender || '').trim();
        let raw = msg.read_by !== undefined ? msg.read_by : msg.read_by_json;
        let arr = [];
        if (Array.isArray(raw)) {
          arr = raw;
        } else if (typeof raw === 'string' && raw.trim()) {
          const trimmed = raw.trim();
          if (trimmed.startsWith('[')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) arr = parsed;
            } catch(e) {}
          } else {
            arr = trimmed.split(',');
          }
        }
        return Array.from(new Set(
          arr.map(u => String(u || '').trim()).filter(u => u && u !== 'ゲスト' && u !== senderName)
        ));
      }

      function normalizeMessageRecord(msg) {
        if (!msg || typeof msg !== 'object') return msg;
        return { ...msg, read_by: parseReadBy(msg) };
      }

      function isViewActiveForRead() {
        if (currentView !== 'chat' || !activeRoomId) return false;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
        if (!parentWindowActive) return false;
        return true;
      }

      function markMessageAsReadLocal(msgId, count) {
        let map = {};
        try {
          const raw = localStorage.getItem(READ_MAP_KEY);
          if (raw) map = JSON.parse(raw);
        } catch(e) {}
        if (!map[msgId] || map[msgId] < count) {
          map[msgId] = count;
          localStorage.setItem(READ_MAP_KEY, JSON.stringify(map));
          return true;
        }
        return false;
      }

      function getMessageReadCountLocal(msgId) {
        let map = {};
        try {
          const raw = localStorage.getItem(READ_MAP_KEY);
          if (raw) map = JSON.parse(raw);
        } catch(e) {}
        return map[msgId] || 0;
      }

      function startLocalPresence() {
        if (localPresenceInterval) clearInterval(localPresenceInterval);
        localPresenceInterval = setInterval(() => {
          if (!activeRoomId) return;
          let data = {};
          try {
            const raw = localStorage.getItem(ACTIVE_USERS_KEY);
            if (raw) data = JSON.parse(raw);
          } catch(e) {}
          if (!data[activeRoomId]) data[activeRoomId] = {};
          data[activeRoomId][getSessionUser()] = Date.now();
          localStorage.setItem(ACTIVE_USERS_KEY, JSON.stringify(data));
          updateReadReceipts();
        }, 1000);
      }

      function stopLocalPresence() {
        if (localPresenceInterval) {
          clearInterval(localPresenceInterval);
          localPresenceInterval = null;
        }
        if (!activeRoomId) return;
        let data = {};
        try {
          const raw = localStorage.getItem(ACTIVE_USERS_KEY);
          if (raw) data = JSON.parse(raw);
        } catch(e) {}
        if (data[activeRoomId]) {
          delete data[activeRoomId][getSessionUser()];
          localStorage.setItem(ACTIVE_USERS_KEY, JSON.stringify(data));
        }
      }

      function getActiveOtherUsersInRoom(myName) {
        if (supabaseClient && roomPresenceMembers && roomPresenceMembers.length > 0) {
          return Array.from(new Set(roomPresenceMembers.filter(m => m && m !== myName)));
        }
        if (serverRoomMembers && serverRoomMembers.length > 0) {
          return Array.from(new Set(serverRoomMembers.filter(m => m && m !== myName)));
        }
        let data = {};
        try {
          const raw = localStorage.getItem(ACTIVE_USERS_KEY);
          if (raw) data = JSON.parse(raw);
        } catch(e) {}
        const membersInRoom = data[activeRoomId] || {};
        const now = Date.now();
        return Object.keys(membersInRoom).filter(user => user && user !== myName && (now - membersInRoom[user]) < 5000);
      }

      function isCurrentRoomDirect() {
        if (!activeRoomId) return false;
        const db = getLocalDB();
        const r = (db.rooms || []).find(item => item && item.id === activeRoomId)
          || (allRoomsCache || []).find(item => item && item.id === activeRoomId);
        return !!(r && r.type === 'direct');
      }

      function getMessageReadDisplay(msg, myName, activeOthers, isDirect) {
        if (msg && msg._pendingSync) {
          return { count: 0, text: '', title: '' };
        }
        const msgId = msg && msg.id ? String(msg.id) : '';
        const senderName = (msg && msg.sender) || myName;
        const serverReaders = parseReadBy(msg);
        const mergedSet = new Set(serverReaders);
        (activeOthers || []).forEach(u => {
          if (u && u !== 'ゲスト' && u !== senderName) mergedSet.add(u);
        });
        const localFallback = msgId ? getMessageReadCountLocal(msgId) : 0;
        const count = Math.max(mergedSet.size, localFallback);
        const readersList = Array.from(mergedSet);
        let text = '';
        if (count > 0) {
          text = isDirect ? '既読' : ('既読 ' + count);
        }
        const title = readersList.length > 0
          ? ('既読 (' + readersList.length + '人): ' + readersList.join(', '))
          : (count > 0 ? '既読' : '');
        return { count, text, title };
      }

      function updateReadReceipts() {
        const myName = getSessionUser();
        if (!activeRoomId || !myName || myName === 'ゲスト') return;
        const activeOthers = getActiveOtherUsersInRoom(myName);
        const otherActiveCount = activeOthers.length;
        const db = getLocalDB();
        const msgs = (db.messages && db.messages[activeRoomId]) || [];
        const msgMap = new Map();
        msgs.forEach(m => { if (m && m.id) msgMap.set(String(m.id), m); });
        const isDirect = isCurrentRoomDirect();

        if (otherActiveCount > 0) {
          let changed = false;
          msgs.forEach(m => {
            if (m && !m._pendingSync && m.sender === myName) {
              if (markMessageAsReadLocal(String(m.id), otherActiveCount)) {
                changed = true;
              }
            }
          });
          if (changed && !supabaseClient) {
            saveLocalDB(db);
          }
        }

        document.querySelectorAll('.msg.me').forEach(el => {
          const msgId = el.getAttribute('data-msgid');
          const msg = msgId ? msgMap.get(String(msgId)) : null;
          if (msg) {
            const readers = parseReadBy(msg);
            if (readers.length > 0) {
              markMessageAsReadLocal(String(msg.id), readers.length);
            }
          }
          const info = getMessageReadDisplay(msg || { id: msgId, sender: myName }, myName, activeOthers, isDirect);
          const readStatusEl = el.querySelector('.msg-read-status');
          if (readStatusEl) {
            readStatusEl.textContent = info.text;
            readStatusEl.title = info.title;
            readStatusEl.classList.toggle('has-readers', Boolean(info.title && !isDirect));
          }
        });
      }

      const lastMarkReadAtByRoom = new Map();
      let markReadInFlightRoom = null;

      async function markActiveRoomAsRead(targetRoomOverride = null, force = false) {
        const targetRoomId = targetRoomOverride || activeRoomId;
        if (!targetRoomId || currentView !== 'chat' || targetRoomId !== activeRoomId) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        if (!parentWindowActive) return;

        const myName = getSessionUser();
        if (!myName || myName === 'ゲスト') return;

        const now = Date.now();
        const lastAt = lastMarkReadAtByRoom.get(targetRoomId) || 0;
        if (!force && (now - lastAt) < 1200) return;
        if (markReadInFlightRoom === targetRoomId) return;

        lastMarkReadAtByRoom.set(targetRoomId, now);
        markReadInFlightRoom = targetRoomId;
        unreadCounts[targetRoomId] = 0;

        // Optimistically update local message read_by for incoming messages
        try {
          const db = getLocalDB();
          const list = (db.messages && db.messages[targetRoomId]) || [];
          let localChanged = false;
          list.forEach(m => {
            if (m && m.sender !== myName) {
              const cur = parseReadBy(m);
              if (!cur.includes(myName)) {
                cur.push(myName);
                m.read_by = cur;
                localChanged = true;
              }
            }
          });
          if (localChanged) saveLocalDB(db);
        } catch(e) {}

        const backend = getBackendType();
        try {
          if (backend === 'internal' || backend === 'cloudflare') {
            const res = await callServerAPIWithStatus('/api/wetalks/rooms/' + encodeURIComponent(targetRoomId) + '/read', 'POST', {});
            if (res && res.ok) {
              emitRealtimeSync('room_read', targetRoomId);
            }
          } else {
            emitRealtimeSync('room_read', targetRoomId);
          }
        } catch (e) {
        } finally {
          if (markReadInFlightRoom === targetRoomId) {
            markReadInFlightRoom = null;
          }
        }
      }

      let unreadCounts = {};

      const DOM = {
        viewAuth: document.getElementById('view-auth'),
        authTabLogin: document.getElementById('auth-tab-login'),
        authTabSignup: document.getElementById('auth-tab-signup'),
        authUsername: document.getElementById('auth-username'),
        authPassword: document.getElementById('auth-password'),
        btnToggleAuthPass: document.getElementById('btn-toggle-auth-pass'),
        authBackendStatus: document.getElementById('auth-backend-status'),
        authPickCf: document.getElementById('auth-pick-cf'),
        authPickInternal: document.getElementById('auth-pick-internal'),
        authError: document.getElementById('auth-error'),
        authConnHelper: document.getElementById('auth-conn-helper'),
        authConnTargetText: document.getElementById('auth-conn-target-text'),
        btnAuthUseCf: document.getElementById('btn-auth-use-cf'),
        btnAuthUseInternal: document.getElementById('btn-auth-use-internal'),
        btnAuthSubmit: document.getElementById('btn-auth-submit'),
        profileAvatarPreview: document.getElementById('profile-avatar-preview'),
        profileAvatarFile: document.getElementById('profile-avatar-file'),
        btnLogout: document.getElementById('btn-logout'),
        viewLobby: document.getElementById('view-lobby'),
        viewChat: document.getElementById('view-chat'),
        viewSettings: document.getElementById('view-settings'),
        btnBack: document.getElementById('btn-back'),
        btnToSettings: document.getElementById('btn-to-settings'),
        btnVideoCall: document.getElementById('btn-video-call'),
        btnGroupMembers: document.getElementById('btn-group-members'),
        titleText: document.getElementById('title-text'),
        roomCallBanner: document.getElementById('room-call-banner'),
        roomCallBannerText: document.getElementById('room-call-banner-text'),
        btnBannerJoinVideo: document.getElementById('btn-banner-join-video'),
        btnBannerJoinVoice: document.getElementById('btn-banner-join-voice'),
        videoCallStage: document.getElementById('video-call-stage'),
        callStatusLabel: document.getElementById('call-status-label'),
        btnCallExpand: document.getElementById('btn-call-expand'),
        btnCallCollapse: document.getElementById('btn-call-collapse'),
        callVideoGrid: document.getElementById('call-video-grid'),
        callNotice: document.getElementById('call-notice'),
        btnCallCam: document.getElementById('btn-call-cam'),
        btnCallMic: document.getElementById('btn-call-mic'),
        btnCallDeafen: document.getElementById('btn-call-deafen'),
        btnCallLeave: document.getElementById('btn-call-leave'),
        lobbyContactsBar: document.getElementById('lobby-contacts-bar'),
        lobbyContactsList: document.getElementById('lobby-contacts-list'),
        roomList: document.getElementById('room-list-container'),
        messageContainer: document.getElementById('message-container'),
        replyPreviewBar: document.getElementById('reply-preview-bar'),
        replyPreviewSender: document.getElementById('reply-preview-sender'),
        replyPreviewText: document.getElementById('reply-preview-text'),
        btnClearReply: document.getElementById('btn-clear-reply'),
        msgInput: document.getElementById('msg-input'),
        btnSend: document.getElementById('btn-send'),
        msgImageFile: document.getElementById('msg-image-file'),
        btnImageAttach: document.getElementById('btn-image-attach'),
        msgImagePreviewBar: document.getElementById('msg-image-preview-bar'),
        msgImagePreviewThumb: document.getElementById('msg-image-preview-thumb'),
        msgImagePreviewName: document.getElementById('msg-image-preview-name'),
        btnClearMsgImage: document.getElementById('btn-clear-msg-image'),
        modalImageViewer: document.getElementById('modal-image-viewer'),
        imageViewerImg: document.getElementById('image-viewer-img'),
        btnCloseImageViewer: document.getElementById('btn-close-image-viewer'),
        modalConfirmAction: document.getElementById('modal-confirm-action'),
        confirmActionTitle: document.getElementById('confirm-action-title'),
        confirmActionMessage: document.getElementById('confirm-action-message'),
        btnConfirmActionCancel: document.getElementById('btn-confirm-action-cancel'),
        btnConfirmActionOk: document.getElementById('btn-confirm-action-ok'),
        lobbyUsernameTag: document.getElementById('lobby-username-tag'),
        lobbyUsernameEditBtn: document.getElementById('lobby-username-edit-btn'),
        lobbyOnlineCountTag: document.getElementById('lobby-online-count-tag'),
        btnSaveSettings: document.getElementById('btn-save-settings'),
        tabProviderCf: document.getElementById('tab-provider-cf'),
        tabProviderSupabase: document.getElementById('tab-provider-supabase'),
        tabProviderInternal: document.getElementById('tab-provider-internal'),
        sectionCfSettings: document.getElementById('section-cf-settings'),
        sectionSupabaseSettings: document.getElementById('section-supabase-settings'),
        sectionInternalSettings: document.getElementById('section-internal-settings'),
        inputCfUrl: document.getElementById('input-cf-url'),
        btnCfTest: document.getElementById('btn-cf-test'),
        cfTestResult: document.getElementById('cf-test-result'),
        btnCopySql: document.getElementById('btn-copy-sql'),
        cfSchemaSql: document.getElementById('cf-schema-sql'),
        inputSupabaseUrl: document.getElementById('input-supabase-url'),
        inputSupabaseKey: document.getElementById('input-supabase-key'),
        settingsActiveBackendBanner: document.getElementById('settings-active-backend-banner'),
        settingsActiveBackendLabel: document.getElementById('settings-active-backend-label'),
        btnAdminInspectActive: document.getElementById('btn-admin-inspect-active'),
        btnAdminInspectCf: document.getElementById('btn-admin-inspect-cf'),
        btnAdminPruneImages: document.getElementById('btn-admin-prune-images'),
        adminStorageStatus: document.getElementById('admin-storage-status'),
        adminStatUsers: document.getElementById('admin-stat-users'),
        adminStatRooms: document.getElementById('admin-stat-rooms'),
        adminStatMessages: document.getElementById('admin-stat-messages'),
        adminStatImages: document.getElementById('admin-stat-images'),
        tabAdminUsers: document.getElementById('tab-admin-users'),
        tabAdminRooms: document.getElementById('tab-admin-rooms'),
        tabAdminMessages: document.getElementById('tab-admin-messages'),
        adminPanelUsers: document.getElementById('admin-panel-users'),
        adminPanelRooms: document.getElementById('admin-panel-rooms'),
        adminPanelMessages: document.getElementById('admin-panel-messages'),
        adminUserList: document.getElementById('admin-user-list'),
        adminMessageList: document.getElementById('admin-message-list'),
        modalCreate: document.getElementById('modal-create-room'),
        btnOpenCreate: document.getElementById('btn-open-create-modal'),
        btnCreateCancel: document.getElementById('btn-create-cancel'),
        btnCreateConfirm: document.getElementById('btn-create-confirm'),
        inputNewRoomName: document.getElementById('input-new-room-name'),
        selectNewRoomType: document.getElementById('select-new-room-type'),
        containerRoomName: document.getElementById('container-room-name'),
        containerGroupMembers: document.getElementById('container-group-members'),
        createGroupMembersList: document.getElementById('create-group-members-list'),
        btnCreateSelectAll: document.getElementById('btn-create-select-all'),
        containerDirectTarget: document.getElementById('container-direct-target'),
        selectDirectTarget: document.getElementById('select-direct-target'),
        createRoomError: document.getElementById('create-room-error'),
        modalUserAction: document.getElementById('modal-user-action'),
        userActionAvatar: document.getElementById('user-action-avatar'),
        userActionName: document.getElementById('user-action-name'),
        userActionStatus: document.getElementById('user-action-status'),
        btnStartDirectChat: document.getElementById('btn-start-direct-chat'),
        btnUserActionClose: document.getElementById('btn-user-action-close'),
        modalGroupMembers: document.getElementById('modal-group-members'),
        groupMembersModalTitle: document.getElementById('group-members-modal-title'),
        btnGroupMembersClose: document.getElementById('btn-group-members-close'),
        groupCurrentMembersList: document.getElementById('group-current-members-list'),
        groupInviteCandidatesList: document.getElementById('group-invite-candidates-list'),
        groupInviteStatus: document.getElementById('group-invite-status'),
        btnGroupInviteConfirm: document.getElementById('btn-group-invite-confirm'),
        modalPasscode: document.getElementById('modal-passcode'),
        inputPasscode: document.getElementById('input-passcode'),
        btnPasscodeCancel: document.getElementById('btn-passcode-cancel'),
        btnPasscodeConfirm: document.getElementById('btn-passcode-confirm'),
        passcodeError: document.getElementById('passcode-error'),
        modalUsername: document.getElementById('modal-change-username'),
        inputNewUsername: document.getElementById('input-new-username'),
        usernameChangeError: document.getElementById('username-change-error'),
        btnUsernameCancel: document.getElementById('btn-username-cancel'),
        btnUsernameConfirm: document.getElementById('btn-username-confirm'),
        modalAdminRoomChat: document.getElementById('modal-admin-room-chat'),
        adminRoomChatTitle: document.getElementById('admin-room-chat-title'),
        adminRoomChatMembers: document.getElementById('admin-room-chat-members'),
        adminRoomChatList: document.getElementById('admin-room-chat-list'),
        btnAdminRoomChatRefresh: document.getElementById('btn-admin-room-chat-refresh'),
        btnAdminRoomChatClose: document.getElementById('btn-admin-room-chat-close')
      };

      let syncIntervalTimer = null;

      async function initSupabase() {
        const backend = getBackendType();

        if (syncIntervalTimer) {
          clearInterval(syncIntervalTimer);
          syncIntervalTimer = null;
        }

        if (backend === 'cloudflare' || backend === 'internal') {
          // Cloudflare or Internal Server polling sync
          await loadCachedUsers();
          initGlobalPresence();

          if (currentView === 'lobby') {
            renderLobby();
          }
          return;
        }

        // Supabase mode
        let url = localStorage.getItem('wetalks_supabase_url');
        let key = localStorage.getItem('wetalks_supabase_key');
        if (!url || !key) {
          url = 'https://nsyvlftqcciyetsbhymg.supabase.co';
          key = 'sb_publishable_lkhrFuMlNyEmUX4RTFApKw_AhD1sAkV';
          localStorage.setItem('wetalks_supabase_url', url);
          localStorage.setItem('wetalks_supabase_key', key);
        }

        if (typeof supabase === 'undefined' && window.supabase === undefined) {
          for (let i = 0; i < 10; i++) {
            if (typeof supabase !== 'undefined' || window.supabase !== undefined) break;
            await new Promise(r => setTimeout(r, 100));
          }
        }

        const supabaseLib = (typeof supabase !== 'undefined') ? supabase : (window.supabase || null);

        if (url && key && supabaseLib) {
          try {
            supabaseClient = supabaseLib.createClient(url, key);
            initGlobalPresence();
            initGlobalMessageListener();
            await loadCachedUsers();
          } catch(e) {
            console.error("Failed to initialize Supabase:", e);
            supabaseClient = null;
            initGlobalPresence();
            await loadCachedUsers();
          }
        } else {
          supabaseClient = null;
          initGlobalPresence();
          await loadCachedUsers();
        }

        if (currentView === 'lobby') {
          renderLobby();
        }
      }

      function sendOfflinePresence(useKeepalive = false) {
        const backend = getBackendType();
        if (backend !== 'internal' && backend !== 'cloudflare') return;
        try {
          const headers = { 'Content-Type': 'application/json' };
          const token = getAuthToken();
          if (token) headers['Authorization'] = 'Bearer ' + token;
          fetch(buildApiUrl('/api/wetalks/presence'), {
            method: 'POST',
            headers,
            ...(useKeepalive ? { keepalive: true } : {}),
            body: JSON.stringify({ clientId: getClientId(), offline: true })
          }).catch(() => {});
        } catch(e) {}
      }

      async function syncServerPresence() {
        const backend = getBackendType();
        if (backend !== 'internal' && backend !== 'cloudflare') return;
        const uname = getSessionUser();
        if (!uname || uname === 'ゲスト') return;
        const reqRoomId = currentView === 'chat' ? activeRoomId : null;
        try {
          const res = await callServerAPI('/api/wetalks/presence', 'POST', {
            clientId: getClientId(),
            username: uname,
            roomId: reqRoomId
          });
          if (res && typeof res.onlineCount === 'number') {
            if (res.presenceSupported) {
              serverOnlineCount = Math.max(1, res.onlineCount);
            } else {
              // Fallback if deployed Cloudflare Worker returns registered user count without active presence tracking
              serverOnlineCount = Math.max(1, Array.isArray(res.onlineUsers) ? res.onlineUsers.length : 1);
            }
            const currentReqRoomId = currentView === 'chat' ? activeRoomId : null;
            if (reqRoomId === currentReqRoomId) {
              serverRoomMembers = Array.isArray(res.roomMembers) ? res.roomMembers : [];
            }
            serverOnlineUsers = Array.isArray(res.onlineUsers) ? res.onlineUsers : [];
            if (DOM.lobbyOnlineCountTag && !supabaseClient) {
              DOM.lobbyOnlineCountTag.textContent = "● オンライン: " + serverOnlineCount + "人";
            }
            if (currentView === 'chat' && reqRoomId === activeRoomId) {
              updateReadReceipts();
            }
          }
        } catch(e) {}
      }

      let isPollingActiveRoom = false;

      async function pollActiveRoomMessages() {
        const targetRoomId = activeRoomId;
        if (!targetRoomId || currentView !== 'chat' || isPollingActiveRoom) return;
        isPollingActiveRoom = true;
        try {
          syncServerPresence();
          const shouldMarkRead = isViewActiveForRead();
          const querySuffix = shouldMarkRead ? '?markRead=1' : '';
          const msgRes = await callServerAPIWithStatus('/api/wetalks/messages/' + encodeURIComponent(targetRoomId) + querySuffix);
          if (targetRoomId !== activeRoomId || currentView !== 'chat') return;
          if (msgRes.status === 403) {
            activeRoomId = null;
            switchView('lobby');
            return;
          }
          if (!msgRes.ok) return;
          const rawApiMsgs = msgRes.data;
          if (targetRoomId !== activeRoomId || currentView !== 'chat') return;
          const apiMsgs = Array.isArray(rawApiMsgs)
            ? rawApiMsgs
            : (rawApiMsgs && Array.isArray(rawApiMsgs.messages) ? rawApiMsgs.messages : null);
          if (apiMsgs) {
            const myName = getSessionUser();
            const normalizedApi = apiMsgs.map(normalizeMessageRecord);
            const hasUnreadFromOthers = shouldMarkRead && myName && myName !== 'ゲスト' && normalizedApi.some(
              m => m && m.sender && m.sender !== myName && !parseReadBy(m).includes(myName)
            );
            if (hasUnreadFromOthers) {
              markActiveRoomAsRead(targetRoomId, true);
            }

            const db = getLocalDB();
            if (!db.messages) db.messages = {};
            const serverIds = new Set(normalizedApi.filter(m => m && m.id).map(m => String(m.id)));
            const existingMap = new Map();
            (db.messages[targetRoomId] || []).forEach(m => {
              if (m && m.id && m._pendingSync && !serverIds.has(String(m.id))) {
                existingMap.set(String(m.id), m);
              }
            });
            normalizedApi.forEach(m => { if (m && m.id) existingMap.set(String(m.id), m); });
            const merged = Array.from(existingMap.values()).sort((a, b) =>
              String(a.created_at || '').localeCompare(String(b.created_at || ''))
            );
            db.messages[targetRoomId] = merged;
            saveLocalDB(db);

            let hasNew = false;
            const currentRoomTitle = (DOM.titleText && DOM.titleText.textContent) || '';
            normalizedApi.forEach(msg => {
              if (msg && msg.id) {
                checkAndNotifyNewMessage(msg, currentRoomTitle);
                const existingEl = DOM.messageContainer && Array.from(DOM.messageContainer.children).find(el => el.getAttribute('data-msgid') === String(msg.id));
                if (!existingEl) {
                  appendMessageBubble(msg);
                  hasNew = true;
                } else {
                  const staleErr = existingEl.querySelector('.msg-sync-error');
                  if (staleErr) staleErr.remove();
                }
              }
            });
            updateReadReceipts();
            if (hasNew && DOM.messageContainer) {
              DOM.messageContainer.scrollTop = DOM.messageContainer.scrollHeight;
            }
          }
          retryPendingMessagesForRoom(targetRoomId);
        } catch(e) {
        } finally {
          isPollingActiveRoom = false;
        }
      }

      const bgSeededRooms = new Set();
      let lastCrossRoomPollAt = 0;
      let isPollingBackgroundRooms = false;

      async function pollBackgroundOtherRooms(force = false) {
        const myName = getSessionUser();
        if (!myName || myName === 'ゲスト') return;
        if (isPollingBackgroundRooms) return;
        const now = Date.now();
        if (!force && now - lastCrossRoomPollAt < 1200) return;
        lastCrossRoomPollAt = now;
        isPollingBackgroundRooms = true;
        try {
          const rooms = await fetchAllRooms();
          const deletedIds = getDeletedRoomIds();
          const candidates = (rooms || []).filter(r => {
            if (!r || !r.id || deletedIds.includes(r.id)) return false;
            if (currentView === 'chat' && activeRoomId === r.id) return false;
            return isUserInRoom(r, myName);
          }).slice(0, 10);

          let unreadChanged = false;
          await Promise.allSettled(candidates.map(async (room) => {
            try {
              const rawApiMsgs = await callServerAPI('/api/wetalks/messages/' + encodeURIComponent(room.id) + '?summary=1');
              const apiMsgs = Array.isArray(rawApiMsgs)
                ? rawApiMsgs
                : (rawApiMsgs && Array.isArray(rawApiMsgs.messages) ? rawApiMsgs.messages : null);
              if (!apiMsgs) return;
              const normalized = apiMsgs.map(normalizeMessageRecord);
              const isSeedPass = !bgSeededRooms.has(room.id);
              bgSeededRooms.add(room.id);
              const rName = resolveRoomDisplayName(room.id, room.name);

              let realUnread = 0;
              normalized.forEach(msg => {
                if (!msg || !msg.id) return;
                if (msg.sender && msg.sender !== myName && !parseReadBy(msg).includes(myName)) {
                  realUnread++;
                }
                if (isSeedPass) {
                  markMessageNotified(msg.id);
                  return;
                }
                if (!isMessageAlreadySeen(msg.id)) {
                  checkAndNotifyNewMessage(msg, rName);
                }
              });

              if ((unreadCounts[room.id] || 0) !== realUnread) {
                unreadCounts[room.id] = realUnread;
                unreadChanged = true;
              }
            } catch (e) {}
          }));
          if (unreadChanged && currentView === 'lobby') {
            await renderLobby();
          }
        } catch (e) {
        } finally {
          isPollingBackgroundRooms = false;
        }
      }

      async function pollLobbyUpdates() {
        try {
          await Promise.allSettled([loadCachedUsers(), syncServerPresence()]);
          const count = supabaseClient
            ? Math.max(supabaseOnlineCount || 1, 1)
            : Math.max(serverOnlineCount || 1, 1);
          if (DOM.lobbyOnlineCountTag) {
            DOM.lobbyOnlineCountTag.textContent = "● オンライン: " + count + "人";
          }
          await renderLobby();
          await pollBackgroundOtherRooms();
        } catch(e) {}
      }

      function initGlobalPresence() {
        if (!supabaseClient) {
          const count = Math.max(serverOnlineCount || 1, 1);
          if (DOM.lobbyOnlineCountTag) {
            DOM.lobbyOnlineCountTag.textContent = "● オンライン: " + count + "人";
          }
          return;
        }
        try {
          presenceChannel = supabaseClient.channel('global-online-presence');
          presenceChannel
            .on('presence', { event: 'sync' }, () => {
              const state = presenceChannel.presenceState();
              const uniqueUsers = new Set();
              Object.values(state).forEach(presences => {
                (presences || []).forEach(p => {
                  if (p && p.user && p.user !== 'ゲスト') uniqueUsers.add(String(p.user).toLowerCase());
                });
              });
              supabaseOnlineCount = Math.max(1, uniqueUsers.size || Object.keys(state).length);
              if (DOM.lobbyOnlineCountTag) {
                DOM.lobbyOnlineCountTag.textContent = "● オンライン: " + supabaseOnlineCount + "人";
              }
            })
            .subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                try {
                  await presenceChannel.track({ user: getSessionUser(), onlineAt: new Date().toISOString() });
                } catch(e) {}
              } else {
                if (DOM.lobbyOnlineCountTag) {
                  DOM.lobbyOnlineCountTag.textContent = "● オンライン: " + Math.max(supabaseOnlineCount || 1, 1) + "人";
                }
              }
            });
        } catch(e) {
          if (DOM.lobbyOnlineCountTag) {
            DOM.lobbyOnlineCountTag.textContent = "● オンライン: " + Math.max(supabaseOnlineCount || 1, 1) + "人";
          }
        }
      }

      function initGlobalMessageListener() {
        if (!supabaseClient) return;
        supabaseClient
          .channel('global-messages-unread')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const msg = payload.new;
            checkAndNotifyNewMessage(msg);
            if (msg.room_id !== activeRoomId && msg.sender !== getSessionUser()) {
              unreadCounts[msg.room_id] = (unreadCounts[msg.room_id] || 0) + 1;
              if (currentView === 'lobby') renderLobby();
            }
          })
          .subscribe();
      }

      let selectedBackendSettingTab = getBackendType();

      function updateSettingsTabsUI(selected) {
        selectedBackendSettingTab = selected;
        if (DOM.tabProviderCf) {
          DOM.tabProviderCf.style.background = selected === 'cloudflare' ? 'white' : 'transparent';
          DOM.tabProviderCf.style.color = selected === 'cloudflare' ? '#f48120' : '#666';
        }
        if (DOM.tabProviderSupabase) {
          DOM.tabProviderSupabase.style.background = selected === 'supabase' ? 'white' : 'transparent';
          DOM.tabProviderSupabase.style.color = selected === 'supabase' ? '#3ecf8e' : '#666';
        }
        if (DOM.tabProviderInternal) {
          DOM.tabProviderInternal.style.background = selected === 'internal' ? 'white' : 'transparent';
          DOM.tabProviderInternal.style.color = selected === 'internal' ? '#333' : '#666';
        }

        if (DOM.sectionCfSettings) DOM.sectionCfSettings.style.display = selected === 'cloudflare' ? 'flex' : 'none';
        if (DOM.sectionSupabaseSettings) DOM.sectionSupabaseSettings.style.display = selected === 'supabase' ? 'flex' : 'none';
        if (DOM.sectionInternalSettings) DOM.sectionInternalSettings.style.display = selected === 'internal' ? 'flex' : 'none';
      }

      let verifiedAdminPasscode = '';
      let adminInspectMode = 'active'; // 'active' or 'cloudflare'
      let selectedAdminTab = 'users';

      function updateActiveBackendBanner() {
        if (!DOM.settingsActiveBackendLabel) return;
        const active = getBackendType();
        if (active === 'cloudflare') {
          DOM.settingsActiveBackendLabel.textContent = '☁️ Cloudflare Worker (' + getCloudflareUrl() + ')';
          if (DOM.settingsActiveBackendBanner) {
            DOM.settingsActiveBackendBanner.style.background = '#fff7ed';
            DOM.settingsActiveBackendBanner.style.borderColor = '#fdba74';
          }
        } else if (active === 'supabase') {
          DOM.settingsActiveBackendLabel.textContent = '⚡ Supabase';
          if (DOM.settingsActiveBackendBanner) {
            DOM.settingsActiveBackendBanner.style.background = '#ecfdf5';
            DOM.settingsActiveBackendBanner.style.borderColor = '#6ee7b7';
          }
        } else {
          DOM.settingsActiveBackendLabel.textContent = '🖥️ 内蔵 Express サーバー (Cloudflare未切替)';
          if (DOM.settingsActiveBackendBanner) {
            DOM.settingsActiveBackendBanner.style.background = '#f8fafc';
            DOM.settingsActiveBackendBanner.style.borderColor = '#cbd5e1';
          }
        }
      }

      function switchAdminDashboardTab(tab) {
        selectedAdminTab = tab;
        const tabs = [
          { id: 'users', btn: DOM.tabAdminUsers, panel: DOM.adminPanelUsers },
          { id: 'rooms', btn: DOM.tabAdminRooms, panel: DOM.adminPanelRooms },
          { id: 'messages', btn: DOM.tabAdminMessages, panel: DOM.adminPanelMessages }
        ];
        tabs.forEach(t => {
          const isSelected = t.id === tab;
          if (t.btn) {
            t.btn.style.background = isSelected ? 'white' : 'transparent';
            t.btn.style.color = isSelected ? '#0f172a' : '#475569';
          }
          if (t.panel) {
            t.panel.style.display = isSelected ? 'flex' : 'none';
          }
        });
      }

      function buildAdminTargetUrl(endpoint, forceCf) {
        if (forceCf) {
          let cfUrl = ((DOM.inputCfUrl && DOM.inputCfUrl.value) || getCloudflareUrl()).trim();
          if (cfUrl.endsWith('/')) cfUrl = cfUrl.slice(0, -1);
          return cfUrl + endpoint;
        }
        return buildApiUrl(endpoint);
      }

      function showConfirmDialog(title, message) {
        return new Promise((resolve) => {
          if (!DOM.modalConfirmAction || !DOM.btnConfirmActionOk || !DOM.btnConfirmActionCancel) {
            try {
              resolve(confirm(message));
            } catch (e) {
              resolve(true);
            }
            return;
          }
          if (DOM.confirmActionTitle) DOM.confirmActionTitle.textContent = title || '確認';
          if (DOM.confirmActionMessage) DOM.confirmActionMessage.textContent = message || '';
          DOM.modalConfirmAction.classList.add('active');

          const cleanup = (result) => {
            DOM.modalConfirmAction.classList.remove('active');
            DOM.btnConfirmActionOk.removeEventListener('click', onOk);
            DOM.btnConfirmActionCancel.removeEventListener('click', onCancel);
            DOM.modalConfirmAction.removeEventListener('click', onBackdrop);
            resolve(result);
          };
          const onOk = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } cleanup(true); };
          const onCancel = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } cleanup(false); };
          const onBackdrop = (e) => { if (e && e.target === DOM.modalConfirmAction) cleanup(false); };

          DOM.btnConfirmActionOk.addEventListener('click', onOk);
          DOM.btnConfirmActionCancel.addEventListener('click', onCancel);
          DOM.modalConfirmAction.addEventListener('click', onBackdrop);
        });
      }

      async function callAdminApi(endpoint, method = 'GET', forceCf = false) {
        const sep = endpoint.includes('?') ? '&' : '?';
        const fullUrl = buildAdminTargetUrl(endpoint + sep + 'passcode=' + encodeURIComponent(verifiedAdminPasscode || ''), forceCf);
        const opts = { method: method };
        if (method !== 'GET' && method !== 'HEAD') {
          opts.headers = { 'Content-Type': 'application/json' };
        }
        const res = await fetch(fullUrl, opts);
        let data = null;
        try { data = await res.json(); } catch(e) {}
        return { ok: res.ok, status: res.status, data: data };
      }

      async function loadAdminOverview(mode) {
        adminInspectMode = mode || adminInspectMode || 'active';
        const forceCf = adminInspectMode === 'cloudflare';
        const targetBackend = forceCf ? 'cloudflare' : getBackendType();

        if (DOM.adminStorageStatus) {
          DOM.adminStorageStatus.style.background = '#fffbeb';
          DOM.adminStorageStatus.style.borderColor = '#fcd34d';
          DOM.adminStorageStatus.style.color = '#92400e';
          DOM.adminStorageStatus.textContent = (forceCf ? '☁️ Cloudflare Worker ' : '🔄 現在の保存先 ') + 'から保存データを取得中...';
        }

        if (targetBackend === 'supabase' && !forceCf) {
          if (DOM.adminStorageStatus) {
            DOM.adminStorageStatus.textContent = '⚡ Supabase モードが選択されています。Cloudflare のデータを確認するには「☁️ Cloudflare を直接確認」を押してください。';
          }
          renderSettingsRoomList();
          return;
        }

        try {
          let res = await callAdminApi('/api/wetalks/admin/overview', 'GET', forceCf);
          let isLegacyWorker = false;

          // Fallback for older deployed Cloudflare Worker without /api/wetalks/admin/overview
          if (res.status === 404) {
            isLegacyWorker = true;
            const [healthRes, usersRes, roomsRes] = await Promise.all([
              fetch(buildAdminTargetUrl('/api/wetalks/health', forceCf)).then(r => r.ok ? r.json() : null).catch(() => null),
              fetch(buildAdminTargetUrl('/api/wetalks/users', forceCf)).then(r => r.ok ? r.json() : []).catch(() => []),
              fetch(buildAdminTargetUrl('/api/wetalks/rooms', forceCf)).then(r => r.ok ? r.json() : []).catch(() => [])
            ]);
            const legacyUsers = Array.isArray(usersRes) ? usersRes : (usersRes && Array.isArray(usersRes.users) ? usersRes.users : []);
            const legacyRoomsRaw = Array.isArray(roomsRes) ? roomsRes : (roomsRes && Array.isArray(roomsRes.rooms) ? roomsRes.rooms : []);
            const deletedRoomIds = getDeletedRoomIds();
            const legacyRooms = legacyRoomsRaw.filter(r => r && r.id && !deletedRoomIds.includes(r.id));
            let allLegacyMsgs = [];
            const roomCounts = {};
            for (const rm of legacyRooms.slice(0, 15)) {
              try {
                const rms = await fetch(buildAdminTargetUrl('/api/wetalks/messages/' + encodeURIComponent(rm.id), forceCf)).then(r => r.ok ? r.json() : []).catch(() => []);
                if (Array.isArray(rms)) {
                  roomCounts[rm.id] = rms.length;
                  rms.forEach(m => allLegacyMsgs.push({ ...m, room_name: rm.name }));
                }
              } catch(e) {}
            }
            allLegacyMsgs.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
            res = {
              ok: true,
              status: 200,
              data: {
                success: true,
                backend: (healthRes && healthRes.hasD1) ? 'Cloudflare D1 (旧Worker)' : 'Cloudflare KV/旧Worker',
                storage_verified: !!(healthRes && (healthRes.hasD1 || healthRes.hasKV)),
                image_retention_days: 10,
                counts: {
                  users: legacyUsers.length,
                  rooms: legacyRooms.length,
                  messages: allLegacyMsgs.length,
                  images: allLegacyMsgs.filter(m => !!m.image_base64).length
                },
                users: legacyUsers.map(u => ({
                  username: u.username,
                  has_password: !!(u.password_numeric || u.password || u.password_hash),
                  password_storage: (u.password_numeric || u.password) ? '旧Worker保存 (平文)' : '確認不可',
                  avatar_base64: u.avatar_base64 || ''
                })),
                rooms: legacyRooms.map(r => ({ ...r, message_count: roomCounts[r.id] || 0 })),
                recent_messages: allLegacyMsgs.slice(0, 50).map(m => ({
                  ...m,
                  has_image: !!m.image_base64
                }))
              }
            };
          }

          if (!res.ok || !res.data || !res.data.success) {
            if (DOM.adminStorageStatus) {
              DOM.adminStorageStatus.style.background = '#fef2f2';
              DOM.adminStorageStatus.style.borderColor = '#fca5a5';
              DOM.adminStorageStatus.style.color = '#991b1b';
              DOM.adminStorageStatus.textContent = '❌ 取得失敗: ' + ((res.data && res.data.error) || ('HTTP ' + res.status + ' — Worker のデプロイまたは接続先 URL を確認してください。'));
            }
            return;
          }

          const ov = res.data;
          if (DOM.adminStorageStatus) {
            if (isLegacyWorker) {
              DOM.adminStorageStatus.style.background = '#fffbeb';
              DOM.adminStorageStatus.style.borderColor = '#fcd34d';
              DOM.adminStorageStatus.style.color = '#92400e';
              DOM.adminStorageStatus.textContent = '⚠️ 旧バージョンの Cloudflare Worker が稼働中です (' + ov.backend + ')。パスワード暗号化や10日画像自動削除を有効にするには、最新の cloudflare/worker.js を Cloudflare に再デプロイしてください。';
            } else if (ov.storage_verified) {
              DOM.adminStorageStatus.style.background = '#f0fdf4';
              DOM.adminStorageStatus.style.borderColor = '#86efac';
              DOM.adminStorageStatus.style.color = '#166534';
              DOM.adminStorageStatus.textContent = '✅ 保存確認OK: ' + (ov.backend || 'Server') + ' に接続・保存されています（画像保持: ' + (ov.image_retention_days || 10) + '日間）';
            } else {
              DOM.adminStorageStatus.style.background = '#fef2f2';
              DOM.adminStorageStatus.style.borderColor = '#fca5a5';
              DOM.adminStorageStatus.style.color = '#991b1b';
              DOM.adminStorageStatus.textContent = '⚠️ 注意: ' + (ov.backend || 'ストレージ未設定') + ' — D1 または KV がバインドされていないためデータは保存されません。';
            }
          }

          if (DOM.adminStatUsers) DOM.adminStatUsers.textContent = String((ov.counts && ov.counts.users) || 0);
          if (DOM.adminStatRooms) DOM.adminStatRooms.textContent = String((ov.counts && ov.counts.rooms) || 0);
          if (DOM.adminStatMessages) DOM.adminStatMessages.textContent = String((ov.counts && ov.counts.messages) || 0);
          if (DOM.adminStatImages) DOM.adminStatImages.textContent = String((ov.counts && ov.counts.images) || 0);

          // Render users list
          if (DOM.adminUserList) {
            DOM.adminUserList.innerHTML = '';
            const users = ov.users || [];
            if (users.length === 0) {
              DOM.adminUserList.innerHTML = '<li style="font-size:11px; color:#64748b; text-align:center; padding:10px; background:#f8fafc; border-radius:6px;">登録ユーザーはまだありません。</li>';
            } else {
              users.forEach(u => {
                const li = document.createElement('li');
                li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; gap:8px;';
                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = 'min-width:0; flex:1;';
                const nameEl = document.createElement('div');
                nameEl.style.cssText = 'font-size:12px; font-weight:bold; color:#0f172a;';
                nameEl.textContent = u.username;
                const pwEl = document.createElement('div');
                pwEl.style.cssText = 'font-size:10px; color:' + (u.has_password ? '#16a34a' : '#dc2626') + ';';
                pwEl.textContent = 'パスワード: ' + (u.has_password ? ('✅ ' + (u.password_storage || '保存済み')) : '❌ 未保存');
                infoDiv.appendChild(nameEl);
                infoDiv.appendChild(pwEl);

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.textContent = '削除';
                delBtn.style.cssText = 'background:#ef4444; color:#fff; border:none; border-radius:4px; padding:4px 10px; font-size:10px; font-weight:bold; cursor:pointer; flex-shrink:0;';
                delBtn.addEventListener('click', async () => {
                  const confirmed = await showConfirmDialog('ユーザーの削除', 'ユーザー「' + u.username + '」をサーバーから削除しますか？');
                  if (!confirmed) return;
                  delBtn.disabled = true;
                  try {
                    await callAdminApi('/api/wetalks/admin/users/' + encodeURIComponent(u.username), 'DELETE', forceCf);
                    await loadAdminOverview(adminInspectMode);
                  } finally {
                    delBtn.disabled = false;
                  }
                });
                li.appendChild(infoDiv);
                li.appendChild(delBtn);
                DOM.adminUserList.appendChild(li);
              });
            }
          }

          // Render messages & images list
          if (DOM.adminMessageList) {
            DOM.adminMessageList.innerHTML = '';
            const msgs = ov.recent_messages || [];
            if (msgs.length === 0) {
              DOM.adminMessageList.innerHTML = '<li style="font-size:11px; color:#64748b; text-align:center; padding:10px; background:#f8fafc; border-radius:6px;">チャット履歴はまだありません。</li>';
            } else {
              msgs.forEach(m => {
                const li = document.createElement('li');
                li.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; gap:8px;';
                const left = document.createElement('div');
                left.style.cssText = 'min-width:0; flex:1; display:flex; flex-direction:column; gap:3px;';
                const head = document.createElement('div');
                head.style.cssText = 'font-size:10px; color:#64748b;';
                const dt = m.created_at ? new Date(m.created_at).toLocaleString('ja-JP') : '';
                head.textContent = (m.sender || '') + ' • [' + (m.room_name || m.room_id) + '] • ' + dt;
                left.appendChild(head);

                if (m.text) {
                  const txt = document.createElement('div');
                  txt.style.cssText = 'font-size:12px; color:#0f172a; word-break:break-word;';
                  txt.textContent = m.text;
                  left.appendChild(txt);
                }

                if (m.has_image && m.image_base64 && m.image_base64.startsWith('data:image/')) {
                  const imgWrap = document.createElement('div');
                  imgWrap.style.cssText = 'display:flex; align-items:center; gap:8px; margin-top:2px;';
                  const thumb = document.createElement('img');
                  thumb.src = m.image_base64;
                  thumb.style.cssText = 'width:44px; height:44px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer;';
                  thumb.addEventListener('click', () => {
                    if (DOM.imageViewerImg && DOM.modalImageViewer) {
                      DOM.imageViewerImg.src = m.image_base64;
                      DOM.modalImageViewer.classList.add('active');
                    }
                  });
                  const expText = document.createElement('span');
                  expText.style.cssText = 'font-size:10px; color:#0284c7; font-weight:bold;';
                  let remText = '🖼️ 10日自動削除対象';
                  if (m.image_expires_at) {
                    const remDays = Math.max(0, Math.ceil((Date.parse(m.image_expires_at) - Date.now()) / (24 * 60 * 60 * 1000)));
                    remText = '🖼️ 残り約' + remDays + '日で自動削除';
                  }
                  expText.textContent = remText;
                  imgWrap.appendChild(thumb);
                  imgWrap.appendChild(expText);
                  left.appendChild(imgWrap);
                } else if (m.image_expired) {
                  const expNote = document.createElement('div');
                  expNote.style.cssText = 'font-size:10px; color:#64748b;';
                  expNote.textContent = '🖼️ 画像は10日経過により自動削除済み';
                  left.appendChild(expNote);
                }

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.textContent = '削除';
                delBtn.style.cssText = 'background:#ef4444; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:10px; font-weight:bold; cursor:pointer; flex-shrink:0;';
                delBtn.addEventListener('click', async () => {
                  const confirmed = await showConfirmDialog('履歴の削除', 'この履歴を削除しますか？');
                  if (!confirmed) return;
                  delBtn.disabled = true;
                  try {
                    await callAdminApi('/api/wetalks/admin/messages/' + encodeURIComponent(m.id), 'DELETE', forceCf);
                    await loadAdminOverview(adminInspectMode);
                  } finally {
                    delBtn.disabled = false;
                  }
                });

                li.appendChild(left);
                li.appendChild(delBtn);
                DOM.adminMessageList.appendChild(li);
              });
            }
          }
          await renderSettingsRoomList(ov.rooms || [], forceCf);
          return;
        } catch (err) {
          if (DOM.adminStorageStatus) {
            DOM.adminStorageStatus.style.background = '#fef2f2';
            DOM.adminStorageStatus.style.borderColor = '#fca5a5';
            DOM.adminStorageStatus.style.color = '#991b1b';
            DOM.adminStorageStatus.textContent = '❌ 接続エラー: ' + ((err && err.message) || 'バックエンドに接続できませんでした。');
          }
        }
        renderSettingsRoomList(null, forceCf);
      }

      function resetChatRoomDOMState(clearInput = true) {
        renderMessagesSeq++;
        loadRoomSeq++;
        renderedChatRoomId = null;
        serverRoomMembers = [];
        roomPresenceMembers = [];
        if (DOM.messageContainer) {
          DOM.messageContainer.innerHTML = '';
          DOM.messageContainer.scrollTop = 0;
        }
        clearPendingChatImage();
        clearPendingReply();
        if (clearInput && DOM.msgInput) DOM.msgInput.value = '';
        if (DOM.modalGroupMembers) DOM.modalGroupMembers.classList.remove('active');
        if (msgChannel && supabaseClient) {
          try { supabaseClient.removeChannel(msgChannel); } catch(e) {}
          msgChannel = null;
        }
      }

      function switchView(view) {
        currentView = view;
        DOM.viewAuth.style.display = (view === 'auth') ? 'flex' : 'none';
        DOM.viewLobby.style.display = (view === 'lobby') ? 'flex' : 'none';
        DOM.viewSettings.style.display = (view === 'settings') ? 'flex' : 'none';
        if (view !== 'chat') {
          DOM.viewChat.style.display = 'none';
          if (typeof leaveVideoCall === 'function') leaveVideoCall(true);
          if (typeof updateRoomCallBanner === 'function') updateRoomCallBanner();
        }

        try {
          localStorage.setItem(ACTIVE_VIEWING_ROOM_KEY, (view === 'chat' && activeRoomId) ? String(activeRoomId) : '');
        } catch (e) {}

        if (view === 'auth') {
          stopLocalPresence();
          activeRoomId = null;
          resetChatRoomDOMState(true);
          DOM.btnBack.style.visibility = 'hidden';
          DOM.btnToSettings.style.visibility = 'visible';
          if (DOM.btnVideoCall) DOM.btnVideoCall.style.display = 'none';
          if (DOM.btnGroupMembers) DOM.btnGroupMembers.style.display = 'none';
          DOM.titleText.textContent = 'We talks';
          if (typeof updateAuthBackendPickerUI === 'function') updateAuthBackendPickerUI();
        } else if (view === 'lobby') {
          stopLocalPresence();
          activeRoomId = null;
          resetChatRoomDOMState(true);
          DOM.btnBack.style.visibility = 'hidden';
          DOM.btnToSettings.style.visibility = 'visible';
          if (DOM.btnVideoCall) DOM.btnVideoCall.style.display = 'none';
          if (DOM.btnGroupMembers) DOM.btnGroupMembers.style.display = 'none';
          DOM.titleText.textContent = 'We talks';
          renderLobby();
          syncServerPresence();
        } else if (view === 'chat') {
          if (renderedChatRoomId !== activeRoomId) {
            if (typeof callState !== 'undefined' && callState.active && callState.roomId !== activeRoomId) {
              leaveVideoCall(true);
            }
            resetChatRoomDOMState(true);
            DOM.titleText.textContent = 'トークルーム';
          }
          bgSeededRooms.add(activeRoomId);
          startLocalPresence();
          DOM.btnBack.style.visibility = 'visible';
          DOM.btnToSettings.style.visibility = 'hidden';
          if (DOM.btnVideoCall) DOM.btnVideoCall.style.display = 'inline-flex';
          unreadCounts[activeRoomId] = 0;
          loadRoomTitleAndRender();
          if (currentView === 'chat') {
            DOM.viewChat.style.display = 'flex';
            if (DOM.messageContainer) {
              DOM.messageContainer.scrollTop = DOM.messageContainer.scrollHeight;
            }
            syncServerPresence();
            if (typeof probeRoomCallStatus === 'function' && activeRoomId) {
              probeRoomCallStatus(activeRoomId);
            }
            if (typeof updateRoomCallBanner === 'function') updateRoomCallBanner();
          }
        } else if (view === 'settings') {
          stopLocalPresence();
          resetChatRoomDOMState(false);
          DOM.btnBack.style.visibility = 'visible';
          DOM.btnToSettings.style.visibility = 'hidden';
          if (DOM.btnVideoCall) DOM.btnVideoCall.style.display = 'none';
          if (DOM.btnGroupMembers) DOM.btnGroupMembers.style.display = 'none';
          DOM.titleText.textContent = '管理者・接続設定';
          if (DOM.inputCfUrl) DOM.inputCfUrl.value = localStorage.getItem('wetalks_cloudflare_url') || 'https://wetalks-backend.mozunbu0123.workers.dev';
          if (DOM.inputSupabaseUrl) DOM.inputSupabaseUrl.value = localStorage.getItem('wetalks_supabase_url') || '';
          if (DOM.inputSupabaseKey) DOM.inputSupabaseKey.value = localStorage.getItem('wetalks_supabase_key') || '';
          if (DOM.cfTestResult) DOM.cfTestResult.style.display = 'none';
          updateActiveBackendBanner();
          updateSettingsTabsUI(getBackendType());
          switchAdminDashboardTab(selectedAdminTab || 'users');
          loadAdminOverview('active');
        }
      }

      const pendingCreatedRooms = new Map();

      async function fetchAllRooms() {
        const roomMap = new Map();
        const localRoomById = new Map();
        const deletedIds = getDeletedRoomIds();

        // 1. Local DB rooms (immediate fallback)
        try {
          const localRooms = (getLocalDB() && getLocalDB().rooms) ? getLocalDB().rooms : [];
          localRooms.forEach(r => {
            if (r && r.id && !deletedIds.includes(r.id)) {
              localRoomById.set(r.id, r);
              roomMap.set(r.id, r);
            }
          });
        } catch(e) {}

        // 2. Fetch remote
        let remoteRoomsFetched = false;
        const serverRoomMap = new Map();
        const promises = [];

        const mergeRoomWithLocal = (r) => {
          const localR = localRoomById.get(r.id);
          if (!Array.isArray(r.members) && localR && Array.isArray(localR.members)) {
            return { ...r, members: localR.members, created_by: r.created_by || localR.created_by || '' };
          }
          return r;
        };

        // Server API / Cloudflare
        promises.push((async () => {
          try {
            const apiRooms = await callServerAPI('/api/wetalks/rooms');
            const roomArr = Array.isArray(apiRooms) ? apiRooms : (apiRooms && Array.isArray(apiRooms.rooms) ? apiRooms.rooms : null);
            if (roomArr) {
              remoteRoomsFetched = true;
              roomArr.forEach(r => {
                if (r && r.id && !deletedIds.includes(r.id)) {
                  const merged = mergeRoomWithLocal(r);
                  serverRoomMap.set(r.id, merged);
                  roomMap.set(r.id, merged);
                }
              });
            }
          } catch(e) {}
        })());

        // Supabase
        if (supabaseClient) {
          promises.push((async () => {
            try {
              const res = await withTimeout(supabaseClient.from('rooms').select('*'), 1500);
              if (res && res.data && Array.isArray(res.data)) {
                res.data.forEach(r => {
                  if (r && r.id && !deletedIds.includes(r.id)) {
                    const merged = mergeRoomWithLocal(r);
                    serverRoomMap.set(r.id, merged);
                    roomMap.set(r.id, merged);
                  }
                });
              }
            } catch(e) {}
          })());
        }

        await Promise.allSettled(promises);

        // If authoritative server API responded, sync local DB rooms with server state
        if (remoteRoomsFetched) {
          pendingCreatedRooms.forEach((r, id) => {
            if (!deletedIds.includes(id) && !serverRoomMap.has(id)) {
              serverRoomMap.set(id, r);
            }
          });
          const syncedRooms = Array.from(serverRoomMap.values()).filter(r => r && r.id && !deletedIds.includes(r.id));
          allRoomsCache = syncedRooms;
          try {
            const db = getLocalDB();
            const myName = getSessionUser();
            // Preserve local rooms belonging to other accounts on shared browser if needed, but overwrite visible set cleanly
            const otherLocalRooms = (db.rooms || []).filter(lr => lr && lr.id && !deletedIds.includes(lr.id) && !isUserInRoom(lr, myName));
            const combined = [...otherLocalRooms, ...syncedRooms];
            const uniq = new Map();
            combined.forEach(r => { if (r && r.id) uniq.set(r.id, r); });
            db.rooms = Array.from(uniq.values());
            saveLocalDB(db);
          } catch(e) {}
          return syncedRooms;
        }

        const fallbackRooms = Array.from(roomMap.values()).filter(r => r && r.id && !deletedIds.includes(r.id));
        allRoomsCache = fallbackRooms;
        return fallbackRooms;
      }

      let currentAdminInspectedRoom = null;
      let currentAdminInspectedForceCf = false;

      async function openAdminRoomChatViewer(room, forceCf = false) {
        if (!room || !DOM.modalAdminRoomChat) return;
        currentAdminInspectedRoom = room;
        currentAdminInspectedForceCf = !!forceCf;
        const membersArr = Array.isArray(room.members) ? room.members : [];
        if (DOM.adminRoomChatTitle) {
          DOM.adminRoomChatTitle.textContent = (room.type === 'group' ? '👥 ' : '👤 ') + (room.name || room.id);
        }
        if (DOM.adminRoomChatMembers) {
          DOM.adminRoomChatMembers.textContent = membersArr.length > 0
            ? ('参加メンバー (' + membersArr.length + '人): ' + membersArr.join(', '))
            : '参加メンバー情報なし (全メッセージ閲覧モード)';
        }
        if (DOM.adminRoomChatList) {
          DOM.adminRoomChatList.innerHTML = '<div style="font-size:12px; color:#64748b; text-align:center; padding:24px;">チャット履歴を読み込み中...</div>';
        }
        DOM.modalAdminRoomChat.classList.add('active');

        try {
          const res = await callAdminApi('/api/wetalks/admin/rooms/' + encodeURIComponent(room.id) + '/messages', 'GET', forceCf);
          let messages = [];
          let resolvedRoom = room;

          if (res.ok && res.data && Array.isArray(res.data.messages)) {
            messages = res.data.messages;
            if (res.data.room) resolvedRoom = res.data.room;
          } else if (res.status === 404) {
            // Fallback for older Cloudflare Worker without /admin/rooms/:id/messages
            const ovRes = await callAdminApi('/api/wetalks/admin/overview', 'GET', forceCf);
            if (ovRes.ok && ovRes.data && Array.isArray(ovRes.data.recent_messages)) {
              messages = ovRes.data.recent_messages
                .filter(m => m && m.room_id === room.id)
                .slice()
                .reverse();
            }
          } else {
            if (DOM.adminRoomChatList) {
              DOM.adminRoomChatList.innerHTML = '<div style="font-size:12px; color:#dc2626; text-align:center; padding:20px;">取得失敗: ' + ((res.data && res.data.error) || ('HTTP ' + res.status)) + '</div>';
            }
            return;
          }

          if (resolvedRoom && Array.isArray(resolvedRoom.members) && DOM.adminRoomChatMembers) {
            DOM.adminRoomChatMembers.textContent = resolvedRoom.members.length > 0
              ? ('参加メンバー (' + resolvedRoom.members.length + '人): ' + resolvedRoom.members.join(', '))
              : '参加メンバー情報なし';
          }

          if (!DOM.adminRoomChatList) return;
          DOM.adminRoomChatList.innerHTML = '';
          if (messages.length === 0) {
            DOM.adminRoomChatList.innerHTML = '<div style="font-size:12px; color:#64748b; text-align:center; padding:24px;">このルームのメッセージはまだありません。</div>';
            return;
          }

          messages.forEach(m => {
            const card = document.createElement('div');
            card.style.cssText = 'background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; display:flex; flex-direction:column; gap:4px;';

            const topRow = document.createElement('div');
            topRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:8px;';
            const senderTime = document.createElement('div');
            senderTime.style.cssText = 'font-size:11px; font-weight:bold; color:#0f172a;';
            const dt = m.created_at ? new Date(m.created_at).toLocaleString('ja-JP') : '';
            senderTime.textContent = (m.sender || '不明') + ' • ' + dt;

            const delMsgBtn = document.createElement('button');
            delMsgBtn.type = 'button';
            delMsgBtn.textContent = '削除';
            delMsgBtn.style.cssText = 'background:#ef4444; color:#fff; border:none; border-radius:4px; padding:2px 8px; font-size:10px; font-weight:bold; cursor:pointer; flex-shrink:0;';
            delMsgBtn.addEventListener('click', async () => {
              const confirmed = await showConfirmDialog('メッセージ削除', 'このメッセージをサーバーから削除しますか？');
              if (!confirmed) return;
              delMsgBtn.disabled = true;
              try {
                await callAdminApi('/api/wetalks/admin/messages/' + encodeURIComponent(m.id), 'DELETE', forceCf);
                await openAdminRoomChatViewer(resolvedRoom, forceCf);
                await loadAdminOverview(adminInspectMode);
              } finally {
                delMsgBtn.disabled = false;
              }
            });

            topRow.appendChild(senderTime);
            topRow.appendChild(delMsgBtn);
            card.appendChild(topRow);

            if (m.reply_to && (m.reply_to.sender || m.reply_to.text)) {
              const quote = document.createElement('div');
              quote.style.cssText = 'font-size:11px; color:#475569; background:#f1f5f9; border-left:3px solid #06C755; padding:4px 8px; border-radius:4px;';
              quote.textContent = '↩ ' + (m.reply_to.sender || '') + ': ' + (m.reply_to.text || (m.reply_to.has_image ? '🖼️ 画像' : ''));
              card.appendChild(quote);
            }

            if (m.text) {
              const txt = document.createElement('div');
              txt.style.cssText = 'font-size:13px; color:#1e293b; white-space:pre-wrap; word-break:break-word;';
              txt.textContent = m.text;
              card.appendChild(txt);
            }

            if (m.image_base64 && String(m.image_base64).startsWith('data:image/')) {
              const img = document.createElement('img');
              img.src = m.image_base64;
              img.style.cssText = 'max-width:160px; max-height:140px; border-radius:6px; border:1px solid #cbd5e1; object-fit:cover; cursor:pointer; margin-top:2px;';
              img.addEventListener('click', () => {
                if (DOM.imageViewerImg && DOM.modalImageViewer) {
                  DOM.imageViewerImg.src = m.image_base64;
                  DOM.modalImageViewer.classList.add('active');
                }
              });
              card.appendChild(img);
            } else if (m.image_expired) {
              const exp = document.createElement('div');
              exp.style.cssText = 'font-size:10px; color:#64748b;';
              exp.textContent = '🖼️ 画像は10日経過により自動削除済み';
              card.appendChild(exp);
            }

            if (Array.isArray(m.read_by) && m.read_by.length > 0) {
              const readEl = document.createElement('div');
              readEl.style.cssText = 'font-size:10px; color:#0284c7;';
              readEl.textContent = '既読 (' + m.read_by.length + '人): ' + m.read_by.join(', ');
              card.appendChild(readEl);
            }

            DOM.adminRoomChatList.appendChild(card);
          });
          DOM.adminRoomChatList.scrollTop = DOM.adminRoomChatList.scrollHeight;
        } catch (err) {
          if (DOM.adminRoomChatList) {
            DOM.adminRoomChatList.innerHTML = '<div style="font-size:12px; color:#dc2626; text-align:center; padding:20px;">読み込みエラー: ' + ((err && err.message) || 'Unknown error') + '</div>';
          }
        }
      }

      async function renderSettingsRoomList(roomsOverride = null, forceCf = false) {
        const container = document.getElementById('settings-room-list');
        if (!container) return;
        container.innerHTML = '<li style="font-size:12px; color:#888; text-align:center; padding:10px;">読み込み中...</li>';
        const rooms = Array.isArray(roomsOverride) ? roomsOverride : await fetchAllRooms();
        container.innerHTML = '';
        if (rooms.length === 0) {
          container.innerHTML = '<li style="font-size:12px; color:#888; background:rgba(0,0,0,0.03); padding:12px; border-radius:6px; text-align:center;">作成されたトークルームはありません。</li>';
          return;
        }
        rooms.forEach(room => {
          const li = document.createElement('li');
          li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#ffffff; border:1px solid #e2e8f0; padding:10px 12px; border-radius:6px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); gap: 8px;';
          
          const leftWrapper = document.createElement('div');
          leftWrapper.style.cssText = 'display:flex; align-items:center; gap:10px; min-width:0; flex:1;';

          const icon = document.createElement('span');
          icon.style.cssText = 'font-size:16px; flex-shrink:0;';
          icon.textContent = room.type === 'group' ? '👥' : '👤';

          const textCol = document.createElement('div');
          textCol.style.cssText = 'min-width:0; flex:1; overflow:hidden;';

          let displayName = room.name;
          if (room.type === 'direct') {
            const myName = getSessionUser();
            const parts = room.name.replace(/@/g, '').split(' & ');
            if (parts.length === 2) {
              displayName = (parts[0] === myName ? parts[1] : parts[0]) + ' との1対1 (' + parts[0] + ' & ' + parts[1] + ')';
            }
          }

          const nameSpan = document.createElement('div');
          nameSpan.style.cssText = 'font-size:13px; font-weight:bold; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
          nameSpan.textContent = displayName;

          const metaSpan = document.createElement('div');
          metaSpan.style.cssText = 'font-size:10px; color:#64748b; word-break:break-word;';
          const countPart = typeof room.message_count === 'number' ? (' • 履歴: ' + room.message_count + '件') : '';
          const membersPart = (Array.isArray(room.members) && room.members.length > 0) ? (' • メンバー: ' + room.members.join(', ')) : '';
          metaSpan.textContent = (room.type === 'group' ? 'グループ' : '1対1') + countPart + membersPart;

          textCol.appendChild(nameSpan);
          textCol.appendChild(metaSpan);
          leftWrapper.appendChild(icon);
          leftWrapper.appendChild(textCol);

          const btnGroup = document.createElement('div');
          btnGroup.style.cssText = 'display:flex; align-items:center; gap:6px; flex-shrink:0;';

          const viewChatBtn = document.createElement('button');
          viewChatBtn.type = 'button';
          viewChatBtn.style.cssText = 'background:#0284c7; color:white; border:none; padding:6px 10px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold; flex-shrink:0;';
          viewChatBtn.textContent = '💬 チャットを見る';
          viewChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openAdminRoomChatViewer(room, forceCf);
          });

          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.style.cssText = 'background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold; flex-shrink:0; transition:background 0.15s;';
          delBtn.textContent = '🗑️ 削除';
          delBtn.addEventListener('mouseover', () => { delBtn.style.background = '#dc2626'; });
          delBtn.addEventListener('mouseout', () => { delBtn.style.background = '#ef4444'; });
          
          delBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const confirmed = await showConfirmDialog(
              'トークルームの削除',
              '本当に「' + displayName + '」トークルームと、その中のチャット履歴をすべて削除しますか？\\n（この操作は取り消せません）'
            );
            if (!confirmed) return;

            delBtn.disabled = true;
            delBtn.textContent = '削除中...';
            try {
              await deleteRoomAndMessages(room.id, forceCf);
              if (li.parentNode) li.parentNode.removeChild(li);
              await loadAdminOverview(adminInspectMode);
              await renderLobby();
            } catch (err) {
              console.error('Room delete error:', err);
              if (DOM.adminStorageStatus) {
                DOM.adminStorageStatus.style.background = '#fef2f2';
                DOM.adminStorageStatus.style.borderColor = '#fca5a5';
                DOM.adminStorageStatus.style.color = '#991b1b';
                DOM.adminStorageStatus.textContent = '❌ ルーム削除中にエラーが発生しました: ' + ((err && err.message) || 'Unknown error');
              }
            } finally {
              delBtn.disabled = false;
              delBtn.textContent = '🗑️ 削除';
            }
          });

          btnGroup.appendChild(viewChatBtn);
          btnGroup.appendChild(delBtn);

          li.appendChild(leftWrapper);
          li.appendChild(btnGroup);
          container.appendChild(li);
        });
      }

      async function deleteRoomAndMessages(roomId, forceCf = false) {
        if (!roomId) return { ok: false };

        pendingCreatedRooms.delete(roomId);
        renderedRoomIdsHash = '';

        // 1. Record deleted room ID in permanent blocklist so it never gets resurrected by API/defaults
        addDeletedRoomId(roomId);

        // 2. Delete locally first
        try {
          const raw = localStorage.getItem(DB_KEY);
          if (raw) {
            const db = JSON.parse(raw);
            if (db.rooms) db.rooms = db.rooms.filter(r => r && r.id !== roomId);
            if (db.messages && db.messages[roomId]) delete db.messages[roomId];
            localStorage.setItem(DB_KEY, JSON.stringify(db));
          }
        } catch(e) {
          console.error("Local delete error:", e);
        }

        // 3. Delete from Supabase if connected
        if (supabaseClient && !forceCf) {
          try {
            await Promise.allSettled([
              withTimeout(supabaseClient.from('messages').delete().eq('room_id', roomId), 2500),
              withTimeout(supabaseClient.from('rooms').delete().eq('id', roomId), 2500)
            ]);
            const ch = supabaseClient.channel('global-lobby');
            ch.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                ch.send({ type: 'broadcast', event: 'room_deleted', payload: { roomId } }).then(() => {
                  supabaseClient.removeChannel(ch);
                });
              }
            });
          } catch(e) {
            console.warn("Supabase delete room warning:", e);
          }
        }

        // 4. Delete on shared server API / Cloudflare Worker (no custom x-admin-passcode header so CORS never blocks)
        let remoteOk = true;
        try {
          const endpoint = '/api/wetalks/rooms/' + encodeURIComponent(roomId);
          const targetUrl = forceCf ? buildAdminTargetUrl(endpoint, true) : buildApiUrl(endpoint);
          const headers = { 'Content-Type': 'application/json' };
          const token = getAuthToken();
          if (token) headers['Authorization'] = 'Bearer ' + token;
          const res = await fetch(targetUrl, { method: 'DELETE', headers });
          remoteOk = res.ok;
          if (!res.ok) {
            console.warn("API delete room status:", res.status);
          }
        } catch(e) {
          remoteOk = false;
          console.warn("API delete room warning:", e);
        }

        // 5. If currently inside the deleted room, return to lobby
        if (activeRoomId === roomId) {
          activeRoomId = null;
          switchView('lobby');
        }
        return { ok: remoteOk };
      }

      let currentUserActionTarget = '';

      function openUserActionModal(targetUsername) {
        if (!targetUsername || targetUsername === 'ゲスト') return;
        if (targetUsername === getSessionUser()) {
          openProfileEditModal();
          return;
        }
        currentUserActionTarget = targetUsername;
        if (DOM.userActionAvatar) DOM.userActionAvatar.src = getAvatarDataUri(targetUsername);
        if (DOM.userActionName) DOM.userActionName.textContent = targetUsername;
        if (DOM.userActionStatus) {
          const isOnline = serverOnlineUsers.some(u => String(u).toLowerCase() === String(targetUsername).toLowerCase());
          DOM.userActionStatus.textContent = isOnline ? '● オンライン' : 'オフライン';
          DOM.userActionStatus.style.color = isOnline ? '#16a34a' : '#64748b';
        }
        if (DOM.modalUserAction) DOM.modalUserAction.classList.add('active');
      }

      async function startDirectChatWith(targetUsername) {
        const myName = getSessionUser();
        if (!targetUsername || !myName || myName === 'ゲスト' || targetUsername === myName) return;

        if (DOM.modalUserAction) DOM.modalUserAction.classList.remove('active');
        if (DOM.modalGroupMembers) DOM.modalGroupMembers.classList.remove('active');
        if (DOM.modalCreate) DOM.modalCreate.classList.remove('active');

        const sorted = [myName, targetUsername].sort();
        const canonicalName = '@' + sorted[0] + ' & @' + sorted[1];

        // Check existing direct room locally or remotely
        const findDirect = (list) => (list || []).find(r => {
          if (!r || r.type !== 'direct') return false;
          if (Array.isArray(r.members) && r.members.length === 2) {
            return r.members.includes(myName) && r.members.includes(targetUsername);
          }
          return r.name === canonicalName;
        });

        const localRooms = (getLocalDB() && getLocalDB().rooms) || [];
        let existing = findDirect(localRooms);
        if (!existing) {
          try {
            const remoteRooms = await fetchAllRooms();
            existing = findDirect(remoteRooms);
          } catch(e) {}
        }

        if (existing) {
          activeRoomId = existing.id;
          switchView('chat');
          return;
        }

        const roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        removeDeletedRoomId(roomId);
        const roomObj = {
          id: roomId,
          name: canonicalName,
          type: 'direct',
          members: sorted,
          created_by: myName
        };
        pendingCreatedRooms.set(roomId, roomObj);

        const db = getLocalDB();
        if (!db.rooms) db.rooms = [];
        db.rooms.push(roomObj);
        if (!db.messages) db.messages = {};
        if (!db.messages[roomId]) db.messages[roomId] = [];
        saveLocalDB(db);

        activeRoomId = roomId;
        switchView('chat');

        (async () => {
          try {
            const roomRes = await callServerAPIWithStatus('/api/wetalks/rooms', 'POST', roomObj);
            if (roomRes && roomRes.ok && roomRes.data && roomRes.data.room && roomRes.data.room.id) {
              const serverRoom = roomRes.data.room;
              if (serverRoom.id !== roomId) {
                // Server returned an already-existing canonical direct chat room ID
                const latestDb = getLocalDB();
                latestDb.rooms = (latestDb.rooms || []).filter(r => r && r.id !== roomId);
                if (!latestDb.rooms.some(r => r.id === serverRoom.id)) {
                  latestDb.rooms.push(serverRoom);
                }
                if (latestDb.messages && latestDb.messages[roomId]) {
                  if (!latestDb.messages[serverRoom.id]) latestDb.messages[serverRoom.id] = [];
                  latestDb.messages[serverRoom.id] = [...latestDb.messages[serverRoom.id], ...latestDb.messages[roomId]];
                  delete latestDb.messages[roomId];
                }
                saveLocalDB(latestDb);
                pendingCreatedRooms.delete(roomId);
                if (activeRoomId === roomId) {
                  activeRoomId = serverRoom.id;
                  loadRoomTitleAndRender();
                }
              }
            }
          } catch(e) {}
          if (supabaseClient) {
            try { await supabaseClient.from('rooms').insert([roomObj]); } catch(e) {}
          }
          pendingCreatedRooms.delete(roomId);
        })();
      }

      async function openGroupMembersModal() {
        if (!activeRoomId || !DOM.modalGroupMembers) return;
        if (DOM.groupInviteStatus) DOM.groupInviteStatus.style.display = 'none';
        if (DOM.groupCurrentMembersList) DOM.groupCurrentMembersList.innerHTML = '<div style="font-size:12px; color:#64748b; padding:6px;">読み込み中...</div>';
        if (DOM.groupInviteCandidatesList) DOM.groupInviteCandidatesList.innerHTML = '';
        DOM.modalGroupMembers.classList.add('active');

        await loadCachedUsers().catch(() => {});
        let room = null;
        try {
          const allRooms = await fetchAllRooms();
          room = allRooms.find(r => r.id === activeRoomId) || null;
        } catch(e) {}
        if (!room) {
          const localRooms = (getLocalDB() && getLocalDB().rooms) || [];
          room = localRooms.find(r => r.id === activeRoomId) || null;
        }
        if (!room) return;

        const myName = getSessionUser();
        const members = Array.isArray(room.members) ? room.members : [myName];
        if (DOM.groupMembersModalTitle) {
          DOM.groupMembersModalTitle.textContent = (room.name || 'グループ') + ' (' + members.length + '人)';
        }

        if (DOM.groupCurrentMembersList) {
          DOM.groupCurrentMembersList.innerHTML = '';
          members.forEach(mName => {
            const row = document.createElement('div');
            row.className = 'member-check-row';
            const img = document.createElement('img');
            img.className = 'member-check-avatar';
            img.src = getAvatarDataUri(mName);
            const label = document.createElement('span');
            label.style.cssText = 'flex:1; font-weight:bold; color:#0f172a;';
            label.textContent = mName + (mName === myName ? ' (あなた)' : '');
            row.appendChild(img);
            row.appendChild(label);
            if (mName !== myName) {
              const chatBadge = document.createElement('span');
              chatBadge.style.cssText = 'font-size:10px; color:#06C755; font-weight:bold;';
              chatBadge.textContent = '💬 個人チャット';
              row.appendChild(chatBadge);
              row.addEventListener('click', () => openUserActionModal(mName));
            }
            DOM.groupCurrentMembersList.appendChild(row);
          });
        }

        if (DOM.groupInviteCandidatesList) {
          DOM.groupInviteCandidatesList.innerHTML = '';
          const nonMembers = cachedUsers.filter(u => u && u.username && u.username !== 'ゲスト' && !members.includes(u.username));
          if (nonMembers.length === 0) {
            DOM.groupInviteCandidatesList.innerHTML = '<div style="font-size:12px; color:#64748b; text-align:center; padding:8px;">招待できる他のユーザーはいません。</div>';
            if (DOM.btnGroupInviteConfirm) DOM.btnGroupInviteConfirm.disabled = true;
          } else {
            if (DOM.btnGroupInviteConfirm) DOM.btnGroupInviteConfirm.disabled = false;
            nonMembers.forEach(u => {
              const row = document.createElement('label');
              row.className = 'member-check-row';
              const cb = document.createElement('input');
              cb.type = 'checkbox';
              cb.value = u.username;
              cb.className = 'group-invite-checkbox';
              const img = document.createElement('img');
              img.className = 'member-check-avatar';
              img.src = getAvatarDataUri(u.username);
              const nameSpan = document.createElement('span');
              nameSpan.style.cssText = 'flex:1; font-weight:600; color:#1e293b;';
              nameSpan.textContent = u.username;
              row.appendChild(cb);
              row.appendChild(img);
              row.appendChild(nameSpan);
              DOM.groupInviteCandidatesList.appendChild(row);
            });
          }
        }
      }

      async function confirmInviteMembers() {
        if (!activeRoomId) return;
        const checked = Array.from(document.querySelectorAll('.group-invite-checkbox:checked')).map(el => el.value).filter(Boolean);
        if (checked.length === 0) {
          if (DOM.groupInviteStatus) {
            DOM.groupInviteStatus.style.display = 'block';
            DOM.groupInviteStatus.style.color = '#ef4444';
            DOM.groupInviteStatus.textContent = '招待するユーザーを1人以上選択してください。';
          }
          return;
        }
        if (DOM.btnGroupInviteConfirm) DOM.btnGroupInviteConfirm.disabled = true;
        try {
          const res = await callServerAPIWithStatus(
            '/api/wetalks/rooms/' + encodeURIComponent(activeRoomId) + '/invite',
            'POST',
            { members: checked }
          );
          const db = getLocalDB();
          const localRoom = (db.rooms || []).find(r => r && r.id === activeRoomId);
          if (localRoom) {
            const baseMembers = Array.isArray(localRoom.members) ? localRoom.members : [getSessionUser()];
            localRoom.members = Array.from(new Set([...baseMembers, ...checked]));
            if (res.ok && res.data && res.data.room && Array.isArray(res.data.room.members)) {
              localRoom.members = res.data.room.members;
            }
            saveLocalDB(db);
          }
          if (!res.ok && res.status === 404 && getBackendType() === 'cloudflare') {
            if (DOM.groupInviteStatus) {
              DOM.groupInviteStatus.style.display = 'block';
              DOM.groupInviteStatus.style.color = '#d97706';
              DOM.groupInviteStatus.textContent = '⚠️ ローカルには反映しましたが、旧Cloudflare Workerでは /invite が未対応です。最新の worker.js をデプロイしてください。';
            }
          } else if (!res.ok) {
            if (DOM.groupInviteStatus) {
              DOM.groupInviteStatus.style.display = 'block';
              DOM.groupInviteStatus.style.color = '#ef4444';
              DOM.groupInviteStatus.textContent = (res.data && res.data.error) || '招待に失敗しました。';
            }
            return;
          } else {
            await openGroupMembersModal();
            if (DOM.groupInviteStatus) {
              DOM.groupInviteStatus.style.display = 'block';
              DOM.groupInviteStatus.style.color = '#16a34a';
              DOM.groupInviteStatus.textContent = '✅ ' + checked.join(', ') + ' をグループに招待しました！';
            }
          }
        } finally {
          if (DOM.btnGroupInviteConfirm) DOM.btnGroupInviteConfirm.disabled = false;
        }
      }

      async function loadRoomTitleAndRender() {
        const targetRoomId = activeRoomId;
        if (!targetRoomId) return;
        const seq = ++loadRoomSeq;
        let rawName = "トークルーム";
        let type = "group";
        const myName = getSessionUser();

        // Check local DB first for instantaneous response
        const localRooms = (getLocalDB() && getLocalDB().rooms) ? getLocalDB().rooms : [];
        const localRoom = localRooms.find(r => r.id === targetRoomId);
        if (localRoom) {
          if (!isUserInRoom(localRoom, myName)) {
            activeRoomId = null;
            switchView('lobby');
            return;
          }
          rawName = localRoom.name;
          type = localRoom.type;
        }

        let displayName = rawName;
        if (type === 'direct' && rawName) {
          const parts = rawName.replace(/@/g, '').split(' & ');
          if (parts.length === 2) {
            displayName = parts[0] === myName ? parts[1] : parts[0];
          }
        }
        if (DOM.titleText) DOM.titleText.textContent = displayName;
        if (DOM.btnGroupMembers) {
          DOM.btnGroupMembers.style.display = (type === 'group') ? 'inline-block' : 'none';
        }

        // Render messages immediately without waiting
        renderMessages();

        // Background check for remote room details / authorization
        fetchAllRooms().then(allRooms => {
          if (seq !== loadRoomSeq || currentView !== 'chat' || activeRoomId !== targetRoomId) return;
          const r = allRooms.find(item => item.id === targetRoomId);
          if (r) {
            if (!isUserInRoom(r, myName)) {
              activeRoomId = null;
              switchView('lobby');
              return;
            }
            let dName = r.name;
            if (r.type === 'direct' && r.name) {
              const p = r.name.replace(/@/g, '').split(' & ');
              if (p.length === 2) dName = p[0] === myName ? p[1] : p[0];
            }
            if (DOM.titleText && activeRoomId === r.id) DOM.titleText.textContent = dName;
            if (DOM.btnGroupMembers && activeRoomId === r.id) {
              DOM.btnGroupMembers.style.display = (r.type === 'group') ? 'inline-block' : 'none';
            }
          }
        }).catch(() => {});
      }

      function renderLobbyContactsBar() {
        if (!DOM.lobbyContactsBar || !DOM.lobbyContactsList) return;
        const myName = getSessionUser();
        if (!myName || myName === 'ゲスト') {
          DOM.lobbyContactsBar.style.display = 'none';
          return;
        }
        const others = (cachedUsers || []).filter(u => u && u.username && u.username !== 'ゲスト' && u.username !== myName);
        if (others.length === 0) {
          DOM.lobbyContactsBar.style.display = 'none';
          return;
        }
        DOM.lobbyContactsBar.style.display = 'block';
        DOM.lobbyContactsList.innerHTML = '';
        others.forEach(u => {
          const item = document.createElement('div');
          item.className = 'lobby-contact-item';
          item.title = u.username + ' との個人チャット';
          const wrap = document.createElement('div');
          wrap.className = 'lobby-contact-avatar-wrap';
          const img = document.createElement('img');
          img.className = 'lobby-contact-avatar';
          img.src = getAvatarDataUri(u.username);
          img.alt = u.username;
          wrap.appendChild(img);
          const isOnline = serverOnlineUsers.some(on => String(on).toLowerCase() === String(u.username).toLowerCase());
          if (isOnline) {
            const dot = document.createElement('span');
            dot.className = 'lobby-contact-online-dot';
            wrap.appendChild(dot);
          }
          const nameEl = document.createElement('div');
          nameEl.className = 'lobby-contact-name';
          nameEl.textContent = u.username;
          item.appendChild(wrap);
          item.appendChild(nameEl);
          item.addEventListener('click', () => openUserActionModal(u.username));
          DOM.lobbyContactsList.appendChild(item);
        });
      }

      let renderedRoomIdsHash = '';
      function renderLobbyRoomsDOM(roomsList) {
        if (!DOM.roomList) return;
        const myName = getSessionUser();
        DOM.roomList.innerHTML = '';
        roomsList.filter(r => isUserInRoom(r, myName)).forEach(room => appendRoomItem(room));
        if (DOM.roomList.children.length === 0) {
          const emptyLi = document.createElement('li');
          emptyLi.className = 'room-empty-state';
          emptyLi.style.cssText = 'padding: 32px 16px; text-align: center; color: #64748b; font-size: 13px; line-height: 1.6;';
          emptyLi.textContent = '参加しているトークルームがまだありません。「＋ 新しいトークルームを作成」または上のユーザーアイコンからトークを始められます。';
          DOM.roomList.appendChild(emptyLi);
        }
      }

      async function renderLobby() {
        const myName = getSessionUser();
        if (DOM.lobbyUsernameTag) {
          DOM.lobbyUsernameTag.textContent = myName;
        }

        const onlineCount = supabaseClient
          ? Math.max(supabaseOnlineCount || 1, 1)
          : Math.max(serverOnlineCount || 1, 1);
        if (DOM.lobbyOnlineCountTag) {
          DOM.lobbyOnlineCountTag.textContent = "● オンライン: " + onlineCount + "人";
        }

        renderLobbyContactsBar();

        const deletedIds = getDeletedRoomIds();

        // 1. Render immediately from local DB if room list is empty
        const localRooms = ((getLocalDB() && getLocalDB().rooms) || []).filter(r => r && r.id && !deletedIds.includes(r.id) && isUserInRoom(r, myName));
        if (DOM.roomList && DOM.roomList.children.length === 0) {
          renderLobbyRoomsDOM(localRooms);
          renderedRoomIdsHash = myName + '::' + localRooms.map(r => r.id + ':' + r.name + ':' + (Array.isArray(r.members) ? r.members.join(',') : '') + ':' + (unreadCounts[r.id] || 0)).join('|');
        }

        // 2. Fetch all merged rooms and update ONLY if changed to prevent destroying click events
        try {
          const rooms = await fetchAllRooms();
          const activeRooms = rooms.filter(r => r && r.id && !deletedIds.includes(r.id) && isUserInRoom(r, myName));
          const currentHash = myName + '::' + activeRooms.map(r => r.id + ':' + r.name + ':' + (Array.isArray(r.members) ? r.members.join(',') : '') + ':' + (unreadCounts[r.id] || 0)).join('|');
          if (currentHash !== renderedRoomIdsHash || DOM.roomList.children.length === 0) {
            renderedRoomIdsHash = currentHash;
            renderLobbyRoomsDOM(activeRooms);
          }
        } catch(e) {}
      }

      function appendRoomItem(room) {
        const myName = getSessionUser();
        if (!isUserInRoom(room, myName)) {
          return;
        }
        let displayName = room.name;
        let peerName = '';
        if (room.type === 'direct') {
          const parts = room.name.replace(/@/g, '').split(' & ');
          if (parts.length === 2) {
            peerName = parts[0] === myName ? parts[1] : parts[0];
            displayName = peerName;
          } else {
            return;
          }
        }

        const li = document.createElement('li');
        li.className = 'room-item';
        li.addEventListener('click', () => {
          activeRoomId = room.id;
          switchView('chat');
        });
        const avatar = document.createElement('div');
        avatar.className = 'room-avatar';
        if (room.type === 'group') {
          avatar.textContent = '👥';
          avatar.style.background = '#4ec5f1';
        } else {
          const avImg = document.createElement('img');
          avImg.src = getAvatarDataUri(peerName);
          avImg.style.cssText = 'width:100%; height:100%; border-radius:50%; object-fit:cover;';
          avatar.style.padding = '0';
          avatar.appendChild(avImg);
        }

        const info = document.createElement('div');
        info.className = 'room-info';
        const wrapper = document.createElement('div');
        wrapper.className = 'room-name-wrapper';
        const name = document.createElement('div');
        name.className = 'room-name';
        name.textContent = displayName;
        const type = document.createElement('span');
        type.className = 'room-type';
        if (room.type === 'group') {
          const mCount = Array.isArray(room.members) ? room.members.length : 1;
          type.textContent = 'グループ (' + mCount + '人)';
        } else {
          type.textContent = '1対1トーク';
        }
        wrapper.appendChild(name);
        wrapper.appendChild(type);
        info.appendChild(wrapper);

        const unread = unreadCounts[room.id] || 0;
        if (unread > 0) {
          const badge = document.createElement('span');
          badge.className = 'room-unread-badge';
          badge.textContent = unread;
          info.appendChild(badge);
        }

        li.appendChild(avatar);
        li.appendChild(info);
        DOM.roomList.appendChild(li);
      }

      function formatTime(createdAt) {
        const date = createdAt ? new Date(createdAt) : new Date();
        const hrs = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        return hrs + ':' + mins;
      }

      async function renderMessages() {
        const targetRoomId = activeRoomId;
        if (!targetRoomId) return;
        const seq = ++renderMessagesSeq;
        const isSwitchingRoom = renderedChatRoomId !== targetRoomId;

        if (DOM.messageContainer && isSwitchingRoom) {
          DOM.messageContainer.innerHTML = '';
          DOM.messageContainer.scrollTop = 0;
          renderedChatRoomId = targetRoomId;
        }

        // 1. Instant local render
        const localMsgs = (getLocalDB().messages && getLocalDB().messages[targetRoomId]) || [];
        if (DOM.messageContainer && (DOM.messageContainer.children.length === 0 || isSwitchingRoom)) {
          DOM.messageContainer.innerHTML = '';
          if (localMsgs.length > 0) {
            localMsgs.forEach(msg => appendMessageBubble(msg));
            DOM.messageContainer.scrollTop = DOM.messageContainer.scrollHeight;
          }
        }

        // 2. Fetch remote and sync
        let msgs = localMsgs;
        let fromSupabase = false;
        try {
          if (supabaseClient && !hasSupabaseMessagesTableError) {
            const res = await withTimeout(supabaseClient.from('messages').select('*').eq('room_id', targetRoomId).order('id', { ascending: true }), 1500);
            if (seq !== renderMessagesSeq || targetRoomId !== activeRoomId || currentView !== 'chat') return;
            const data = res.data;
            const error = res.error;
            if (error) {
              if (error.message && (error.message.includes("Could not find the table") || error.code === '42P01' || error.message.includes("schema cache"))) {
                hasSupabaseMessagesTableError = true;
              }
              const apiMsgs = await callServerAPI('/api/wetalks/messages/' + encodeURIComponent(targetRoomId) + (isViewActiveForRead() ? '?markRead=1' : ''));
              if (seq !== renderMessagesSeq || targetRoomId !== activeRoomId || currentView !== 'chat') return;
              msgs = Array.isArray(apiMsgs) ? apiMsgs.map(normalizeMessageRecord) : localMsgs.map(normalizeMessageRecord);
            } else if (data) {
              msgs = Array.isArray(data) ? data.map(normalizeMessageRecord) : data;
              fromSupabase = true;
            }
            if (msgChannel && !hasSupabaseMessagesTableError) {
              try { supabaseClient.removeChannel(msgChannel); } catch(e){}
              msgChannel = null;
            }
            if (!hasSupabaseMessagesTableError) {
              try {
                msgChannel = supabaseClient.channel('room-' + targetRoomId);
                msgChannel
                  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'room_id=eq.' + targetRoomId }, payload => {
                    if (targetRoomId !== activeRoomId || currentView !== 'chat') return;
                    const msg = payload.new;
                    checkAndNotifyNewMessage(msg);
                    appendMessageBubble(msg);
                    if (DOM.messageContainer) DOM.messageContainer.scrollTop = DOM.messageContainer.scrollHeight;
                  })
                  .on('presence', { event: 'sync' }, () => {
                    if (targetRoomId !== activeRoomId || currentView !== 'chat') return;
                    const state = msgChannel.presenceState();
                    roomPresenceMembers = Object.values(state).flatMap(presences => presences.map(p => p.user));
                    updateReadReceipts();
                  })
                  .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED' && targetRoomId === activeRoomId && currentView === 'chat') {
                      try { await msgChannel.track({ user: getSessionUser() }); } catch(e){}
                    }
                  });
              } catch(e) {}
            }
          } else {
            const msgRes = await callServerAPIWithStatus('/api/wetalks/messages/' + encodeURIComponent(targetRoomId) + (isViewActiveForRead() ? '?markRead=1' : ''));
            if (seq !== renderMessagesSeq || targetRoomId !== activeRoomId || currentView !== 'chat') return;
            if (msgRes.status === 403 || msgRes.status === 404) {
              activeRoomId = null;
              switchView('lobby');
              return;
            }
            const rawApiMsgs = msgRes.ok ? msgRes.data : null;
            const apiMsgs = Array.isArray(rawApiMsgs)
              ? rawApiMsgs
              : (rawApiMsgs && Array.isArray(rawApiMsgs.messages) ? rawApiMsgs.messages : null);
            if (apiMsgs) {
              const normalizedApi = apiMsgs.map(normalizeMessageRecord);
              const serverIds = new Set(normalizedApi.filter(m => m && m.id).map(m => String(m.id)));
              const pendingLocal = localMsgs.filter(m => m && m.id && m._pendingSync && !serverIds.has(String(m.id)));
              msgs = [...normalizedApi, ...pendingLocal].sort((a, b) =>
                String(a.created_at || '').localeCompare(String(b.created_at || ''))
              );
              const db = getLocalDB();
              if (!db.messages) db.messages = {};
              db.messages[targetRoomId] = msgs;
              saveLocalDB(db);
            } else {
              msgs = localMsgs.map(normalizeMessageRecord);
            }
          }
        } catch (err) {
          if (seq !== renderMessagesSeq || targetRoomId !== activeRoomId || currentView !== 'chat') return;
          hasSupabaseMessagesTableError = true;
          try {
            const rawApiMsgs = await callServerAPI('/api/wetalks/messages/' + encodeURIComponent(targetRoomId) + (isViewActiveForRead() ? '?markRead=1' : ''));
            if (seq !== renderMessagesSeq || targetRoomId !== activeRoomId || currentView !== 'chat') return;
            const apiMsgs = Array.isArray(rawApiMsgs)
              ? rawApiMsgs
              : (rawApiMsgs && Array.isArray(rawApiMsgs.messages) ? rawApiMsgs.messages : null);
            if (apiMsgs) {
              const normalizedApi = apiMsgs.map(normalizeMessageRecord);
              const serverIds = new Set(normalizedApi.filter(m => m && m.id).map(m => String(m.id)));
              const pendingLocal = localMsgs.filter(m => m && m.id && m._pendingSync && !serverIds.has(String(m.id)));
              msgs = [...normalizedApi, ...pendingLocal].sort((a, b) =>
                String(a.created_at || '').localeCompare(String(b.created_at || ''))
              );
              const db = getLocalDB();
              if (!db.messages) db.messages = {};
              db.messages[targetRoomId] = msgs;
              saveLocalDB(db);
            } else {
              msgs = localMsgs.map(normalizeMessageRecord);
            }
          } catch(e) {
            msgs = localMsgs.map(normalizeMessageRecord);
          }
        }

        if (seq !== renderMessagesSeq || targetRoomId !== activeRoomId || currentView !== 'chat') return;
        renderedChatRoomId = targetRoomId;
        DOM.messageContainer.innerHTML = '';
        msgs.forEach(msg => {
          // Seed existing room history without firing notifications when opening a room
          if (msg && msg.id) markMessageNotified(msg.id);
          appendMessageBubble(msg);
        });
        if (isViewActiveForRead()) {
          markActiveRoomAsRead(targetRoomId, true);
        }
        updateReadReceipts();
        DOM.messageContainer.scrollTop = DOM.messageContainer.scrollHeight;
        retryPendingMessagesForRoom(targetRoomId);
      }

      let pendingChatImageBase64 = '';
      let pendingReplyTo = null;

      function clearPendingReply() {
        pendingReplyTo = null;
        if (DOM.replyPreviewBar) DOM.replyPreviewBar.classList.remove('active');
        if (DOM.replyPreviewSender) DOM.replyPreviewSender.textContent = '↩ 返信先';
        if (DOM.replyPreviewText) DOM.replyPreviewText.textContent = '';
      }

      function setPendingReply(msg) {
        if (!msg || !msg.id) return;
        const snippet = msg.text ? String(msg.text) : (msg.image_base64 ? '🖼️ 画像' : '');
        pendingReplyTo = {
          id: String(msg.id),
          sender: String(msg.sender || ''),
          text: snippet.slice(0, 160),
          has_image: !!(msg.image_base64)
        };
        if (DOM.replyPreviewSender) DOM.replyPreviewSender.textContent = '↩ ' + pendingReplyTo.sender + ' への返信';
        if (DOM.replyPreviewText) DOM.replyPreviewText.textContent = pendingReplyTo.text || '🖼️ 画像';
        if (DOM.replyPreviewBar) DOM.replyPreviewBar.classList.add('active');
        if (DOM.msgInput) DOM.msgInput.focus();
      }

      function clearPendingChatImage() {
        pendingChatImageBase64 = '';
        if (DOM.msgImageFile) DOM.msgImageFile.value = '';
        if (DOM.msgImagePreviewThumb) DOM.msgImagePreviewThumb.src = '';
        if (DOM.msgImagePreviewBar) DOM.msgImagePreviewBar.classList.remove('active');
      }

      function setPendingChatImage(dataUrl, fileName) {
        pendingChatImageBase64 = dataUrl || '';
        if (DOM.msgImagePreviewThumb) DOM.msgImagePreviewThumb.src = pendingChatImageBase64;
        if (DOM.msgImagePreviewName) DOM.msgImagePreviewName.textContent = fileName || '画像を選択中';
        if (DOM.msgImagePreviewBar) {
          if (pendingChatImageBase64) DOM.msgImagePreviewBar.classList.add('active');
          else DOM.msgImagePreviewBar.classList.remove('active');
        }
      }

      function compressChatImage(file) {
        return new Promise((resolve, reject) => {
          if (!file || !file.type || !file.type.startsWith('image/')) {
            reject(new Error('画像ファイルを選択してください。'));
            return;
          }
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
          reader.onload = (ev) => {
            const rawDataUrl = ev.target.result;
            if (file.type === 'image/gif' && file.size <= 1500 * 1024) {
              resolve(rawDataUrl);
              return;
            }
            const img = new Image();
            img.onerror = () => reject(new Error('画像を読み込めませんでした。'));
            img.onload = () => {
              const maxDim = 1024;
              let w = img.width;
              let h = img.height;
              if (w > maxDim || h > maxDim) {
                if (w >= h) {
                  h = Math.round((h * maxDim) / w);
                  w = maxDim;
                } else {
                  w = Math.round((w * maxDim) / h);
                  h = maxDim;
                }
              }
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(rawDataUrl);
                return;
              }
              ctx.drawImage(img, 0, 0, w, h);
              const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
              let outUrl = canvas.toDataURL(outputType, 0.82);
              if (outUrl.length > 1800 * 1024) {
                outUrl = canvas.toDataURL('image/jpeg', 0.72);
              }
              resolve(outUrl);
            };
            img.src = rawDataUrl;
          };
          reader.readAsDataURL(file);
        });
      }

      function appendMessageBubble(msg) {
        if (!msg || !DOM.messageContainer) return;
        if (msg.id && Array.from(DOM.messageContainer.children).some(el => el.getAttribute('data-msgid') === String(msg.id))) {
          return;
        }
        const isMe = msg.sender === getSessionUser();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg ' + (isMe ? 'me' : 'other');
        msgDiv.setAttribute('data-msgid', msg.id);

        if (!isMe) {
          const senderName = document.createElement('div');
          senderName.className = 'msg-sender';
          senderName.textContent = msg.sender;
          senderName.addEventListener('click', (e) => {
            e.stopPropagation();
            openUserActionModal(msg.sender);
          });
          msgDiv.appendChild(senderName);
        }

        const msgRow = document.createElement('div');
        msgRow.className = 'msg-row';

        // Clickable custom profile avatar next to message bubbles
        const avatarImg = document.createElement('img');
        avatarImg.className = 'msg-avatar';
        avatarImg.title = isMe ? 'プロフィールを編集' : (msg.sender + ' のメニューを開く');
        avatarImg.src = getAvatarDataUri(msg.sender);
        avatarImg.addEventListener('click', (e) => {
          e.stopPropagation();
          openUserActionModal(msg.sender);
        });
        msgRow.appendChild(avatarImg);

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';

        if (msg.reply_to && (msg.reply_to.id || msg.reply_to.sender || msg.reply_to.text)) {
          const quoteEl = document.createElement('div');
          quoteEl.className = 'msg-reply-quote';
          const qSender = document.createElement('div');
          qSender.className = 'msg-reply-quote-sender';
          qSender.textContent = '↩ ' + (msg.reply_to.sender || 'メッセージ');
          const qText = document.createElement('div');
          qText.className = 'msg-reply-quote-text';
          qText.textContent = msg.reply_to.text || (msg.reply_to.has_image ? '🖼️ 画像' : '');
          quoteEl.appendChild(qSender);
          quoteEl.appendChild(qText);
          quoteEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!msg.reply_to || !msg.reply_to.id || !DOM.messageContainer) return;
            const targetEl = Array.from(DOM.messageContainer.children).find(
              el => el.getAttribute('data-msgid') === String(msg.reply_to.id)
            );
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              targetEl.classList.add('highlight-flash');
              setTimeout(() => targetEl.classList.remove('highlight-flash'), 1400);
            }
          });
          bubble.appendChild(quoteEl);
        }

        const hasValidImage = typeof msg.image_base64 === 'string' && msg.image_base64.startsWith('data:image/');
        if (hasValidImage) {
          bubble.classList.add('has-image');
          const imgEl = document.createElement('img');
          imgEl.className = 'msg-image';
          imgEl.src = msg.image_base64;
          imgEl.alt = '送信画像';
          imgEl.addEventListener('click', () => {
            if (DOM.imageViewerImg && DOM.modalImageViewer) {
              DOM.imageViewerImg.src = msg.image_base64;
              DOM.modalImageViewer.classList.add('active');
            }
          });
          bubble.appendChild(imgEl);
        }
        if (msg.text) {
          const textDiv = document.createElement('div');
          if (hasValidImage) textDiv.className = 'msg-text-with-image';
          textDiv.textContent = msg.text;
          bubble.appendChild(textDiv);
        } else if (msg.image_expired || !hasValidImage) {
          const expiredDiv = document.createElement('div');
          expiredDiv.style.cssText = 'font-size: 11px; color: #64748b; font-style: italic;';
          expiredDiv.textContent = '🖼️ 送信から10日経過したため画像は自動削除されました';
          bubble.appendChild(expiredDiv);
        }

        const meta = document.createElement('div');
        meta.className = 'msg-meta';

        const replyBtn = document.createElement('button');
        replyBtn.type = 'button';
        replyBtn.className = 'msg-reply-btn';
        replyBtn.title = 'このメッセージに返信する';
        replyBtn.textContent = '↩ 返信';
        replyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setPendingReply(msg);
        });
        meta.appendChild(replyBtn);

        const readStatus = document.createElement('div');
        readStatus.className = 'msg-read-status';
        readStatus.addEventListener('click', (e) => {
          if (readStatus.title && !isCurrentRoomDirect()) {
            e.stopPropagation();
            showReadReadersBanner(readStatus.title);
          }
        });

        if (isMe) {
          const myName = getSessionUser();
          const activeOthers = getActiveOtherUsersInRoom(myName);
          const isDirect = isCurrentRoomDirect();
          const readInfo = getMessageReadDisplay(msg, myName, activeOthers, isDirect);
          if (readInfo.text) readStatus.textContent = readInfo.text;
          if (readInfo.title) readStatus.title = readInfo.title;
          readStatus.classList.toggle('has-readers', Boolean(readInfo.title && !isDirect));
        }

        const time = document.createElement('div');
        time.className = 'msg-time';
        time.textContent = formatTime(msg.created_at);
        meta.appendChild(readStatus);
        meta.appendChild(time);
        if (msg._syncError) {
          meta.appendChild(createSyncErrorElement(msg));
        }
        msgRow.appendChild(bubble);
        msgRow.appendChild(meta);
        msgDiv.appendChild(msgRow);
        DOM.messageContainer.appendChild(msgDiv);
      }

      const syncingPendingMsgIds = new Set();

      function formatSyncErrorText(status, errMsg) {
        if (status === 401) return '⚠️ 要再ログイン';
        if (status === 403) return '⚠️ 送信権限なし';
        if (status === 413) return '⚠️ 画像サイズ超過';
        return '⚠️ 未保存 (再送)';
      }

      function createSyncErrorElement(msg) {
        const errNote = document.createElement('button');
        errNote.type = 'button';
        errNote.className = 'msg-sync-error';
        errNote.style.cssText = 'background:none; border:none; padding:0; font-size:9px; color:#ef4444; font-weight:bold; cursor:pointer; text-decoration:underline;';
        const statusNum = typeof msg._syncStatus === 'number' ? msg._syncStatus : 0;
        errNote.textContent = formatSyncErrorText(statusNum, msg._syncError);
        errNote.title = 'クリックして再送信 (' + String(msg._syncError || '通信エラー') + ')';
        errNote.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (statusNum === 401) {
            clearAuthSession();
            switchView('auth');
            if (DOM.authError) {
              DOM.authError.textContent = 'セッションが切れています。再度ログインしてください。';
              DOM.authError.style.display = 'block';
            }
            return;
          }
          errNote.disabled = true;
          errNote.textContent = '⏳ 再送中...';
          await syncSinglePendingMessage(msg.room_id || activeRoomId, msg, true);
        });
        return errNote;
      }

      function updateMessageSyncDomState(msgId, ok, status, errMsg) {
        const domEl = DOM.messageContainer && Array.from(DOM.messageContainer.children).find(el => el.getAttribute('data-msgid') === String(msgId));
        if (!domEl) return;
        const metaEl = domEl.querySelector('.msg-meta');
        if (!metaEl) return;
        const existingErr = metaEl.querySelector('.msg-sync-error');
        if (ok) {
          if (existingErr) existingErr.remove();
          return;
        }
        const fakeMsg = { id: msgId, room_id: activeRoomId, _syncStatus: status, _syncError: errMsg };
        const latestDb = getLocalDB();
        const storedMsg = (latestDb.messages && latestDb.messages[activeRoomId] || []).find(m => m && m.id === msgId);
        const targetMsg = storedMsg || fakeMsg;
        const nextBtn = createSyncErrorElement(targetMsg);
        if (existingErr) {
          existingErr.replaceWith(nextBtn);
        } else {
          metaEl.appendChild(nextBtn);
        }
      }

      async function postMessageToServer(remotePayload) {
        const sendOnce = async (payload) => {
          let r = await callServerAPIWithStatus('/api/wetalks/messages', 'POST', payload);
          // Fallback for older deployed Cloudflare Worker using POST /api/wetalks/messages/:roomId
          if (r.status === 404 && payload && payload.room_id) {
            r = await callServerAPIWithStatus(
              '/api/wetalks/messages/' + encodeURIComponent(payload.room_id),
              'POST',
              payload
            );
            if (r.status === 400 && !payload.text && payload.image_base64) {
              r = await callServerAPIWithStatus(
                '/api/wetalks/messages/' + encodeURIComponent(payload.room_id),
                'POST',
                { ...payload, text: '📷 画像' }
              );
            }
          }
          return r;
        };

        let res = await sendOnce(remotePayload);
        const retryDelays = [450, 1200];
        for (let i = 0; i < retryDelays.length; i++) {
          const isTransient = !res.ok && (res.status === 0 || res.status === 408 || res.status === 429 || res.status >= 500);
          if (!isTransient) break;
          await new Promise(r => setTimeout(r, retryDelays[i]));
          res = await sendOnce(remotePayload);
        }

        // If backend throws a reply_to schema error, fallback without reply_to object so message still saves
        if (!res.ok && res.status === 500 && remotePayload && remotePayload.reply_to) {
          const errStr = String((res.data && res.data.error) || '').toLowerCase();
          if (errStr.includes('reply_to') || errStr.includes('column')) {
            const { reply_to: _omit, ...withoutReply } = remotePayload;
            const fallbackRes = await sendOnce(withoutReply);
            if (fallbackRes && fallbackRes.ok) return fallbackRes;
          }
        }
        return res;
      }

      async function syncSinglePendingMessage(targetRoomId, msgObj, isManual = false) {
        if (!targetRoomId || !msgObj || !msgObj.id) return false;
        const msgId = String(msgObj.id);
        if (syncingPendingMsgIds.has(msgId)) return false;
        syncingPendingMsgIds.add(msgId);
        try {
          const remotePayload = {
            id: msgId,
            room_id: targetRoomId,
            sender: msgObj.sender || getSessionUser(),
            text: msgObj.text || '',
            image_base64: msgObj.image_base64 || '',
            ...(msgObj.reply_to ? { reply_to: msgObj.reply_to } : {}),
            created_at: msgObj.created_at || new Date().toISOString()
          };
          let serverResult = null;
          if (supabaseClient && !hasSupabaseMessagesTableError) {
            try {
              const supaRow = { room_id: targetRoomId, sender: remotePayload.sender, text: remotePayload.text };
              if (remotePayload.image_base64) supaRow.image_base64 = remotePayload.image_base64;
              const { error } = await supabaseClient.from('messages').insert([supaRow]);
              if (error && (error.message.includes("Could not find the table") || error.code === '42P01' || error.message.includes("schema cache"))) {
                hasSupabaseMessagesTableError = true;
              }
              serverResult = await postMessageToServer(remotePayload);
            } catch(e) {
              serverResult = await postMessageToServer(remotePayload);
            }
          } else {
            serverResult = await postMessageToServer(remotePayload);
          }

          const latestDb = getLocalDB();
          const list = (latestDb.messages && latestDb.messages[targetRoomId]) || [];
          const idx = list.findIndex(m => m && m.id === msgId);
          if (serverResult && serverResult.ok) {
            if (idx >= 0) {
              delete list[idx]._pendingSync;
              delete list[idx]._syncError;
              delete list[idx]._syncStatus;
              delete list[idx]._lastRetryAt;
              delete list[idx]._retryCount;
              saveLocalDB(latestDb);
            }
            if (currentView === 'chat' && activeRoomId === targetRoomId) {
              updateMessageSyncDomState(msgId, true, 200, '');
            }
            if (internalWs && internalWs.readyState === WebSocket.OPEN) {
              try {
                const roomObj =
                  (Array.isArray(allRoomsCache) ? allRoomsCache.find(r => r && r.id === targetRoomId) : null) ||
                  (Array.isArray(latestDb.rooms) ? latestDb.rooms.find(r => r && r.id === targetRoomId) : null);
                internalWs.send(JSON.stringify({
                  type: 'wetalks_notify_message',
                  roomId: targetRoomId,
                  roomName: (roomObj && roomObj.name) || '',
                  members: roomObj && Array.isArray(roomObj.members) ? roomObj.members : undefined,
                  message: {
                    id: msgId,
                    sender: remotePayload.sender,
                    text: String(remotePayload.text || '').slice(0, 300),
                    has_image: !!remotePayload.image_base64,
                    created_at: remotePayload.created_at
                  }
                }));
              } catch (e) {}
            }
            return true;
          } else {
            const errStatus = serverResult ? Number(serverResult.status || 0) : 0;
            const errMsg = (serverResult && serverResult.data && serverResult.data.error) || ('HTTP ' + errStatus);
            if (idx >= 0) {
              list[idx]._syncStatus = errStatus;
              list[idx]._syncError = errMsg;
              list[idx]._lastRetryAt = Date.now();
              list[idx]._retryCount = Number(list[idx]._retryCount || 0) + (isManual ? 0 : 1);
              saveLocalDB(latestDb);
            }
            if (currentView === 'chat' && activeRoomId === targetRoomId) {
              updateMessageSyncDomState(msgId, false, errStatus, errMsg);
            }
            return false;
          }
        } catch(e) {
          return false;
        } finally {
          syncingPendingMsgIds.delete(msgId);
        }
      }

      async function retryPendingMessagesForRoom(targetRoomId, forceNow = false) {
        if (!targetRoomId) return;
        const db = getLocalDB();
        const list = (db.messages && db.messages[targetRoomId]) || [];
        const now = Date.now();
        const candidates = list.filter(m => {
          if (!m || !m.id || !m._pendingSync) return false;
          if (syncingPendingMsgIds.has(String(m.id))) return false;
          const statusNum = typeof m._syncStatus === 'number' ? m._syncStatus : 0;
          // Do not auto-spam non-transient 4xx auth/permission/validation errors
          if (statusNum === 400 || statusNum === 401 || statusNum === 403 || statusNum === 413) return false;
          if (!forceNow && Number(m._retryCount || 0) >= 6) return false;
          if (!forceNow && m._lastRetryAt && (now - Number(m._lastRetryAt)) < 8000) return false;
          return true;
        });
        for (const msg of candidates) {
          await syncSinglePendingMessage(targetRoomId, msg, forceNow);
        }
      }

      function sendMessage() {
        const text = DOM.msgInput.value.trim();
        const imageBase64 = pendingChatImageBase64;
        if ((!text && !imageBase64) || !activeRoomId) return;
        const replyTo = pendingReplyTo ? { ...pendingReplyTo } : null;
        DOM.msgInput.value = '';
        clearPendingChatImage();
        clearPendingReply();

        const targetRoomId = activeRoomId;
        const sender = getSessionUser();
        const msgId = 'm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        const newMsg = {
          id: msgId,
          room_id: targetRoomId,
          sender: sender,
          text: text,
          ...(imageBase64 ? { image_base64: imageBase64 } : {}),
          ...(replyTo ? { reply_to: replyTo } : {}),
          created_at: new Date().toISOString(),
          _pendingSync: true
        };

        // 1. Instant local persistence & UI append
        const db = getLocalDB();
        if (!db.messages) db.messages = {};
        if (!db.messages[targetRoomId]) db.messages[targetRoomId] = [];
        db.messages[targetRoomId].push(newMsg);
        saveLocalDB(db);

        checkAndNotifyNewMessage(newMsg);
        appendMessageBubble(newMsg);
        if (DOM.messageContainer) DOM.messageContainer.scrollTop = DOM.messageContainer.scrollHeight;

        // 2. Background sync to remote (with automatic retry & recovery)
        syncSinglePendingMessage(targetRoomId, newMsg, false).then((ok) => {
          if (ok) {
            emitRealtimeSync('new_message', targetRoomId);
            if (isViewActiveForRead()) markActiveRoomAsRead(targetRoomId, true);
            updateReadReceipts();
          }
        });
      }

      function showCreateRoomError(msg) {
        if (DOM.createRoomError) {
          DOM.createRoomError.textContent = msg;
          DOM.createRoomError.style.display = 'block';
        }
      }

      function createRoom() {
        if (DOM.createRoomError) DOM.createRoomError.style.display = 'none';
        const type = DOM.selectNewRoomType.value;
        const myName = getSessionUser();
        let roomName = "";
        let members = [myName];

        if (type === 'direct') {
          const targetUser = DOM.selectDirectTarget.value;
          if (!targetUser) {
            showCreateRoomError("話す相手のユーザーを選択してください。");
            return;
          }
          startDirectChatWith(targetUser);
          return;
        } else {
          roomName = DOM.inputNewRoomName.value.trim();
          if (!roomName) {
            showCreateRoomError("グループ名を入力してください。");
            return;
          }
          const selected = Array.from(document.querySelectorAll('.create-group-member-cb:checked'))
            .map(el => el.value)
            .filter(Boolean);
          members = Array.from(new Set([myName, ...selected]));
        }

        const roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        removeDeletedRoomId(roomId);

        const roomObj = { id: roomId, name: roomName, type, members, created_by: myName };
        pendingCreatedRooms.set(roomId, roomObj);

        // Always save locally immediately
        const db = getLocalDB();
        if (!db.rooms) db.rooms = [];
        if (!db.rooms.some(r => r.id === roomId)) {
          db.rooms.push(roomObj);
          if (!db.messages) db.messages = {};
          db.messages[roomId] = [];
          saveLocalDB(db);
        }

        DOM.inputNewRoomName.value = '';
        DOM.modalCreate.classList.remove('active');
        activeRoomId = roomId;
        switchView('chat');

        // Background server / Supabase save without blocking UI
        (async () => {
          try {
            const roomRes = await callServerAPIWithStatus('/api/wetalks/rooms', 'POST', roomObj);
            if (roomRes && roomRes.status === 401) {
              clearAuthSession();
              switchView('auth');
              if (DOM.authError) {
                DOM.authError.textContent = 'ルームをサーバーに保存するには再度ログインしてください。';
                DOM.authError.style.display = 'block';
              }
            }
          } catch(e) {}
          if (supabaseClient) {
            try {
              await supabaseClient.from('rooms').insert([roomObj]);
            } catch(e) {}
          }
          pendingCreatedRooms.delete(roomId);
        })();
      }

      DOM.btnBack.addEventListener('click', () => {
        if (currentView === 'chat') {
          if (msgChannel && supabaseClient) {
            supabaseClient.removeChannel(msgChannel);
            msgChannel = null;
          }
          switchView('lobby');
        } else if (currentView === 'settings') {
          const user = getSessionUser();
          if (!user || user === 'ゲスト') {
            switchView('auth');
          } else {
            switchView('lobby');
          }
        }
      });

      DOM.btnToSettings.addEventListener('click', () => {
        DOM.inputPasscode.value = '';
        DOM.passcodeError.style.display = 'none';
        DOM.modalPasscode.classList.add('active');
        DOM.inputPasscode.focus();
      });

      DOM.btnPasscodeCancel.addEventListener('click', () => DOM.modalPasscode.classList.remove('active'));
      const verifyAndEnterSettings = () => {
        const pass = (DOM.inputPasscode.value || '').trim();
        if (pass === 'mozunbu1203') {
          verifiedAdminPasscode = pass;
          DOM.modalPasscode.classList.remove('active');
          switchView('settings');
        } else {
          DOM.passcodeError.style.display = 'block';
        }
      };
      DOM.btnPasscodeConfirm.addEventListener('click', verifyAndEnterSettings);
      DOM.inputPasscode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') verifyAndEnterSettings();
      });
      if (DOM.btnAdminRoomChatClose && DOM.modalAdminRoomChat) {
        DOM.btnAdminRoomChatClose.addEventListener('click', () => DOM.modalAdminRoomChat.classList.remove('active'));
        DOM.modalAdminRoomChat.addEventListener('click', (e) => {
          if (e.target === DOM.modalAdminRoomChat) DOM.modalAdminRoomChat.classList.remove('active');
        });
      }
      if (DOM.btnAdminRoomChatRefresh) {
        DOM.btnAdminRoomChatRefresh.addEventListener('click', () => {
          if (currentAdminInspectedRoom) {
            openAdminRoomChatViewer(currentAdminInspectedRoom, currentAdminInspectedForceCf);
          }
        });
      }

      function updateAuthBackendPickerUI() {
        const b = getBackendType();
        if (DOM.authBackendStatus) {
          if (b === 'cloudflare') {
            DOM.authBackendStatus.textContent = '接続先: ☁️ Cloudflare (共有アカウント)';
          } else if (b === 'internal') {
            DOM.authBackendStatus.textContent = '接続先: 🖥️ 内蔵サーバー (ローカル)';
          } else {
            DOM.authBackendStatus.textContent = '接続先: ⚡ Supabase (自動フォールバック有効)';
          }
        }
        if (DOM.authPickCf) {
          const isCf = b === 'cloudflare';
          DOM.authPickCf.style.background = isCf ? '#fff7ed' : 'white';
          DOM.authPickCf.style.borderColor = isCf ? '#f97316' : '#cbd5e1';
          DOM.authPickCf.style.color = isCf ? '#c2410c' : '#475569';
        }
        if (DOM.authPickInternal) {
          const isInt = b === 'internal';
          DOM.authPickInternal.style.background = isInt ? '#f1f5f9' : 'white';
          DOM.authPickInternal.style.borderColor = isInt ? '#334155' : '#cbd5e1';
          DOM.authPickInternal.style.color = isInt ? '#0f172a' : '#475569';
        }
      }

      if (DOM.authPickCf) {
        DOM.authPickCf.addEventListener('click', () => {
          localStorage.setItem('wetalks_backend_type_v2', 'cloudflare');
          localStorage.setItem('wetalks_backend_type', 'cloudflare');
          if (!localStorage.getItem('wetalks_cloudflare_url')) {
            localStorage.setItem('wetalks_cloudflare_url', DEFAULT_CF_URL);
          }
          if (DOM.authError) DOM.authError.style.display = 'none';
          hideAuthConnHelper();
          updateAuthBackendPickerUI();
        });
      }
      if (DOM.authPickInternal) {
        DOM.authPickInternal.addEventListener('click', () => {
          localStorage.setItem('wetalks_backend_type_v2', 'internal');
          localStorage.setItem('wetalks_backend_type', 'internal');
          if (DOM.authError) DOM.authError.style.display = 'none';
          hideAuthConnHelper();
          updateAuthBackendPickerUI();
        });
      }
      if (DOM.btnToggleAuthPass && DOM.authPassword) {
        DOM.btnToggleAuthPass.addEventListener('click', () => {
          const isPass = DOM.authPassword.type === 'password';
          DOM.authPassword.type = isPass ? 'text' : 'password';
          DOM.btnToggleAuthPass.textContent = isPass ? '🙈' : '👁️';
        });
      }
      updateAuthBackendPickerUI();

      // Auth screen tab switches
      DOM.authTabLogin.addEventListener('click', () => {
        authMode = 'login';
        DOM.authTabLogin.style.background = 'white';
        DOM.authTabLogin.style.color = 'black';
        DOM.authTabSignup.style.background = 'transparent';
        DOM.authTabSignup.style.color = '#555';
        DOM.btnAuthSubmit.textContent = 'ログイン';
        DOM.authError.style.display = 'none';
      });

      DOM.authTabSignup.addEventListener('click', () => {
        authMode = 'signup';
        DOM.authTabSignup.style.background = 'white';
        DOM.authTabSignup.style.color = 'black';
        DOM.authTabLogin.style.background = 'transparent';
        DOM.authTabLogin.style.color = '#555';
        DOM.btnAuthSubmit.textContent = '新規作成してログイン';
        DOM.authError.style.display = 'none';
      });

      function hideAuthConnHelper() {
        if (DOM.authConnHelper) DOM.authConnHelper.style.display = 'none';
      }

      function showAuthConnHelper(res) {
        if (!DOM.authConnHelper) return;
        const backend = getBackendType();
        const target = (res && res.targetUrl) || buildApiUrl('');
        const reason = (res && res.timedOut) ? 'タイムアウト' : '通信エラー / 接続不可';
        if (DOM.authConnTargetText) {
          DOM.authConnTargetText.textContent = '接続先 (' + backend + '): ' + target + ' [' + reason + ']';
        }
        DOM.authConnHelper.style.display = 'flex';
      }

      function switchActiveBackend(nextBackend, cfUrlOverride = null) {
        localStorage.setItem('wetalks_backend_type_v2', nextBackend);
        localStorage.setItem('wetalks_backend_type', nextBackend);
        if (nextBackend === 'cloudflare' && cfUrlOverride) {
          localStorage.setItem('wetalks_cloudflare_url', cfUrlOverride);
        }
        updateAuthBackendPickerUI();
        updateActiveBackendBanner();
      }

      async function postToDefaultCfDirect(endpoint, body) {
        try {
          const r = await fetch(DEFAULT_CF_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          let data = null;
          try { data = await r.json(); } catch(e) {}
          return { ok: r.ok, status: r.status, data: data, targetUrl: DEFAULT_CF_URL + endpoint };
        } catch (e) {
          return { ok: false, status: 0, data: null, targetUrl: DEFAULT_CF_URL + endpoint, errorMessage: (e && e.message) || 'Network error' };
        }
      }

      function hasWorkingInternalOrigin() {
        try {
          if (window.location && window.location.hostname && window.location.hostname.endsWith('github.io')) return false;
        } catch(e) {}
        const org = resolveInternalOrigin();
        return !!(org && org.startsWith('http'));
      }

      async function callAuthRequestWithRetry(endpoint, body, mode = 'login') {
        const currentBackend = getBackendType();
        let res = await callServerAPIWithStatus(endpoint, 'POST', body, { timeoutMs: 15000, skipAuth: true });
        if (res.status === 0) {
          await new Promise(r => setTimeout(r, 350));
          res = await callServerAPIWithStatus(endpoint, 'POST', body, { timeoutMs: 15000, skipAuth: true });
        }

        // If custom Cloudflare URL failed to reach Worker, try DEFAULT_CF_URL automatically
        if (currentBackend === 'cloudflare' && !res.ok && (res.status === 0 || res.status === 404 || res.status >= 500) && getCloudflareUrl() !== DEFAULT_CF_URL) {
          const defaultRes = await postToDefaultCfDirect(endpoint, body);
          if (defaultRes.ok) {
            switchActiveBackend('cloudflare', DEFAULT_CF_URL);
            return defaultRes;
          }
        }

        // If currently set to internal: fall back to Cloudflare on unreachable (0/404/5xx) OR on login 401 (account stored on Cloudflare D1!)
        if (currentBackend === 'internal' && !res.ok && (res.status === 0 || res.status === 404 || res.status >= 500 || (mode === 'login' && res.status === 401))) {
          let cfRes = await callServerAPIWithStatus(endpoint, 'POST', body, {
            backend: 'cloudflare',
            timeoutMs: 15000,
            skipAuth: true
          });
          if (!cfRes.ok && (cfRes.status === 0 || cfRes.status === 404 || cfRes.status >= 500) && getCloudflareUrl() !== DEFAULT_CF_URL) {
            cfRes = await postToDefaultCfDirect(endpoint, body);
            if (cfRes.ok) {
              switchActiveBackend('cloudflare', DEFAULT_CF_URL);
              return cfRes;
            }
          }
          if (cfRes.ok) {
            switchActiveBackend('cloudflare');
            return cfRes;
          }
          // If internal was unreachable (0/404) even if CF returned 401/409, surface the CF error rather than network failure
          if (res.status === 0 && cfRes.status !== 0) {
            switchActiveBackend('cloudflare');
            return cfRes;
          }
        }

        // Conversely, if on Cloudflare and login gets 401 (account registered locally on internal server), also check internal server
        if (currentBackend === 'cloudflare' && mode === 'login' && !res.ok && (res.status === 401 || res.status === 0) && hasWorkingInternalOrigin()) {
          const intRes = await callServerAPIWithStatus(endpoint, 'POST', body, {
            backend: 'internal',
            timeoutMs: 8000,
            skipAuth: true
          });
          if (intRes.ok) {
            switchActiveBackend('internal');
            return intRes;
          }
        }

        return res;
      }

      // Auth form submission handler
      async function handleAuthSubmit() {
        const username = DOM.authUsername.value.trim();
        const password = DOM.authPassword.value.trim();
        DOM.authError.style.display = 'none';
        hideAuthConnHelper();

        if (!username) {
          showAuthError("ユーザー名を入力してください。");
          return;
        }
        if (username === 'ゲスト') {
          showAuthError("「ゲスト」というユーザー名は使用できません。");
          return;
        }
        if (username.length > 24) {
          showAuthError("ユーザー名は24文字以内で入力してください。");
          return;
        }
        if (!password) {
          showAuthError("パスワードを入力してください。");
          return;
        }

        let backend = getBackendType();
        DOM.btnAuthSubmit.disabled = true;
        DOM.btnAuthSubmit.textContent = authMode === 'signup' ? '新規作成中...' : 'ログイン中...';

        try {
          if (backend === 'internal' || backend === 'cloudflare') {
            if (authMode === 'signup') {
              if (password.length < 4) {
                showAuthError("パスワードは4文字以上で入力してください。");
                return;
              }
              const res = await callAuthRequestWithRetry('/api/wetalks/register', {
                username: username,
                password: password,
                avatar_base64: ''
              }, 'signup');
              backend = getBackendType();
              if (res.ok && res.data && res.data.token) {
                setAuthSession(res.data.user.username, res.data.token);
              } else if (res.status === 404 && backend === 'cloudflare') {
                // Fallback for older deployed Cloudflare Worker without /api/wetalks/register
                const existingRes = await callServerAPIWithStatus('/api/wetalks/users', 'GET', null, { skipAuth: true });
                const existingList = (existingRes.ok && Array.isArray(existingRes.data))
                  ? existingRes.data
                  : (existingRes.ok && existingRes.data && Array.isArray(existingRes.data.users) ? existingRes.data.users : []);
                if (existingList.some(u => String(u.username || '').toLowerCase().trim() === username.toLowerCase())) {
                  showAuthError("このユーザー名は既に登録されています。");
                  return;
                }
                const legacyRes = await callServerAPIWithStatus('/api/wetalks/users', 'POST', {
                  username: username,
                  password: password,
                  password_numeric: password,
                  avatar_base64: ''
                }, { skipAuth: true });
                if (!legacyRes.ok || !legacyRes.data || legacyRes.data.error || legacyRes.data.success === false) {
                  if (legacyRes.status === 0) {
                    showAuthError("サーバーに接続できませんでした。接続設定をご確認ください。");
                    showAuthConnHelper(legacyRes);
                  } else {
                    showAuthError((legacyRes.data && legacyRes.data.error) || "新規登録に失敗しました。");
                  }
                  return;
                }
                setAuthSession(username, (legacyRes.data && legacyRes.data.token) || 'legacy-cf');
              } else {
                if (res.status === 0) {
                  showAuthError("サーバーに接続できませんでした。下のボタンで接続先を切り替えて再試行してください。");
                  showAuthConnHelper(res);
                } else {
                  showAuthError((res.data && res.data.error) || "新規登録に失敗しました。");
                }
                return;
              }
            } else {
              const res = await callAuthRequestWithRetry('/api/wetalks/login', {
                username: username,
                password: password
              }, 'login');
              backend = getBackendType();
              if (res.ok && res.data && res.data.token) {
                setAuthSession(res.data.user.username, res.data.token);
              } else if (res.status === 404 && backend === 'cloudflare') {
                // Fallback for older deployed Cloudflare Worker without /api/wetalks/login
                const usersRes = await callServerAPIWithStatus('/api/wetalks/users', 'GET', null, { skipAuth: true });
                const usersList = (usersRes.ok && Array.isArray(usersRes.data))
                  ? usersRes.data
                  : (usersRes.ok && usersRes.data && Array.isArray(usersRes.data.users) ? usersRes.data.users : []);
                const found = usersList.find(
                  u => String(u.username || '').toLowerCase().trim() === username.toLowerCase() &&
                       String((u.password_numeric ?? u.password) || '').trim() === password
                );
                if (!found) {
                  showAuthError("ユーザー名またはパスワードが正しくありません。");
                  return;
                }
                setAuthSession(found.username, 'legacy-cf');
              } else {
                if (res.status === 0) {
                  showAuthError("サーバーに接続できませんでした。下のボタンで接続先を切り替えて再試行してください。");
                  showAuthConnHelper(res);
                } else {
                  showAuthError((res.data && res.data.error) || "ユーザー名またはパスワードが正しくありません。");
                }
                return;
              }
            }

            await loadCachedUsers();
            DOM.authUsername.value = '';
            DOM.authPassword.value = '';
            DOM.authPassword.type = 'password';
            if (DOM.btnToggleAuthPass) DOM.btnToggleAuthPass.textContent = '👁️';
            DOM.authError.style.display = 'none';
            hideAuthConnHelper();
            renderedRoomIdsHash = '';
            switchView('lobby');
            syncServerPresence();
            return;
          }

          // Supabase mode (with automatic Cloudflare / Internal API fallback if Supabase table/match fails)
          await loadCachedUsers();

          if (authMode === 'signup') {
            if (password.length < 4) {
              showAuthError("パスワードは4文字以上で入力してください。");
              return;
            }
            const supaUserExists = supabaseClient && !hasSupabaseUsersTableError &&
              cachedUsers.some(u => String(u.username).toLowerCase().trim() === username.toLowerCase() && u.password);
            if (supaUserExists) {
              showAuthError("このユーザー名は既に登録されています。");
              return;
            }

            let registeredInSupabase = false;
            if (supabaseClient && !hasSupabaseUsersTableError) {
              try {
                const { error: insertErr } = await supabaseClient
                  .from('wetalks_users')
                  .insert([{
                    username: username,
                    password_numeric: password,
                    avatar_base64: ''
                  }]);
                if (insertErr) {
                  hasSupabaseUsersTableError = true;
                } else {
                  registeredInSupabase = true;
                }
              } catch (err) {
                hasSupabaseUsersTableError = true;
              }
            }

            if (registeredInSupabase) {
              await loadCachedUsers();
              setAuthSession(username, '');
              DOM.authUsername.value = '';
              DOM.authPassword.value = '';
              DOM.authError.style.display = 'none';
              switchView('lobby');
              if (presenceChannel) {
                try { presenceChannel.unsubscribe(); } catch(e){}
                initGlobalPresence();
              }
              return;
            }

            // Supabase unavailable -> register on Cloudflare (or internal) with real token auth
            let regRes = await callServerAPIWithStatus('/api/wetalks/register', 'POST', {
              username: username,
              password: password,
              avatar_base64: ''
            }, { backend: 'cloudflare', timeoutMs: 15000, skipAuth: true });
            if (regRes.ok && regRes.data && regRes.data.token) {
              switchActiveBackend('cloudflare');
              setAuthSession(regRes.data.user.username, regRes.data.token);
            } else if (hasWorkingInternalOrigin() && (regRes.status === 0 || regRes.status === 404)) {
              regRes = await callServerAPIWithStatus('/api/wetalks/register', 'POST', {
                username: username,
                password: password,
                avatar_base64: ''
              }, { backend: 'internal', timeoutMs: 10000, skipAuth: true });
              if (!regRes.ok || !regRes.data || !regRes.data.token) {
                showAuthError((regRes.data && regRes.data.error) || "新規登録に失敗しました。");
                return;
              }
              switchActiveBackend('internal');
              setAuthSession(regRes.data.user.username, regRes.data.token);
            } else {
              showAuthError((regRes.data && regRes.data.error) || "新規登録に失敗しました。");
              return;
            }

            await loadCachedUsers();
            DOM.authUsername.value = '';
            DOM.authPassword.value = '';
            DOM.authError.style.display = 'none';
            switchView('lobby');
            syncServerPresence();
          } else {
            // 1. Check Supabase cached users only if password field actually exists
            const foundSupa = cachedUsers.find(
              u => u.password !== undefined &&
                   String(u.username).toLowerCase().trim() === username.toLowerCase() &&
                   String(u.password || '').trim() === password
            );
            if (foundSupa) {
              setAuthSession(foundSupa.username, '');
              DOM.authUsername.value = '';
              DOM.authPassword.value = '';
              DOM.authError.style.display = 'none';
              switchView('lobby');
              if (presenceChannel) {
                try { presenceChannel.unsubscribe(); } catch(e){}
                initGlobalPresence();
              }
              return;
            }

            // 2. Authenticate via Cloudflare D1 (then internal server) instead of matching stripped /api/wetalks/users
            let apiLogin = await callServerAPIWithStatus('/api/wetalks/login', 'POST', {
              username: username,
              password: password
            }, { backend: 'cloudflare', timeoutMs: 15000, skipAuth: true });
            if (apiLogin.ok && apiLogin.data && apiLogin.data.token) {
              switchActiveBackend('cloudflare');
              setAuthSession(apiLogin.data.user.username, apiLogin.data.token);
            } else if (hasWorkingInternalOrigin()) {
              const intLogin = await callServerAPIWithStatus('/api/wetalks/login', 'POST', {
                username: username,
                password: password
              }, { backend: 'internal', timeoutMs: 8000, skipAuth: true });
              if (intLogin.ok && intLogin.data && intLogin.data.token) {
                switchActiveBackend('internal');
                setAuthSession(intLogin.data.user.username, intLogin.data.token);
              } else {
                showAuthError((apiLogin.data && apiLogin.data.error) || "ユーザー名またはパスワードが正しくありません。");
                return;
              }
            } else {
              showAuthError((apiLogin.data && apiLogin.data.error) || "ユーザー名またはパスワードが正しくありません。");
              return;
            }

            await loadCachedUsers();
            DOM.authUsername.value = '';
            DOM.authPassword.value = '';
            DOM.authPassword.type = 'password';
            if (DOM.btnToggleAuthPass) DOM.btnToggleAuthPass.textContent = '👁️';
            DOM.authError.style.display = 'none';
            switchView('lobby');
            syncServerPresence();
          }
        } finally {
          DOM.btnAuthSubmit.disabled = false;
          DOM.btnAuthSubmit.textContent = authMode === 'signup' ? '新規作成してログイン' : 'ログイン';
        }
      }

      DOM.btnAuthSubmit.addEventListener('click', handleAuthSubmit);
      DOM.authUsername.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAuthSubmit(); });
      DOM.authPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAuthSubmit(); });

      function showAuthError(msg) {
        DOM.authError.textContent = msg;
        DOM.authError.style.display = 'block';
      }

      // Profile avatar change handler
      DOM.profileAvatarFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          selectedAvatarBase64 = event.target.result;
          DOM.profileAvatarPreview.src = selectedAvatarBase64;
        };
        reader.readAsDataURL(file);
      });

      function openProfileEditModal() {
        const username = getSessionUser();
        DOM.inputNewUsername.value = username;
        if (DOM.usernameChangeError) DOM.usernameChangeError.style.display = 'none';

        const currentAvatar = getUserAvatar(username);
        DOM.profileAvatarPreview.src = currentAvatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="25" fill="%23ddd"/><text x="25" y="32" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23555" text-anchor="middle">' + encodeURIComponent(username.charAt(0).toUpperCase()) + '</text></svg>';
        
        DOM.profileAvatarFile.value = '';
        selectedAvatarBase64 = null;
        DOM.modalUsername.classList.add('active');
        setTimeout(() => DOM.inputNewUsername.focus(), 50);
      }

      DOM.lobbyUsernameTag.addEventListener('click', openProfileEditModal);
      if (DOM.lobbyUsernameEditBtn) {
        DOM.lobbyUsernameEditBtn.addEventListener('click', openProfileEditModal);
      }

      DOM.btnUsernameCancel.addEventListener('click', () => {
        selectedAvatarBase64 = null;
        if (DOM.usernameChangeError) DOM.usernameChangeError.style.display = 'none';
        DOM.modalUsername.classList.remove('active');
      });

      async function saveProfileChanges() {
        const oldUsername = getSessionUser();
        const newUsername = (DOM.inputNewUsername.value || '').trim();
        if (DOM.usernameChangeError) DOM.usernameChangeError.style.display = 'none';

        if (!newUsername) {
          if (DOM.usernameChangeError) {
            DOM.usernameChangeError.textContent = 'ユーザー名を入力してください。';
            DOM.usernameChangeError.style.display = 'block';
          }
          return;
        }
        if (newUsername === 'ゲスト') {
          if (DOM.usernameChangeError) {
            DOM.usernameChangeError.textContent = 'このユーザー名は使用できません。';
            DOM.usernameChangeError.style.display = 'block';
          }
          return;
        }
        if (newUsername.length > 24) {
          if (DOM.usernameChangeError) {
            DOM.usernameChangeError.textContent = 'ユーザー名は24文字以内で入力してください。';
            DOM.usernameChangeError.style.display = 'block';
          }
          return;
        }

        let activeUsername = oldUsername;

        if (newUsername !== oldUsername) {
          if (getBackendType() === 'internal' || getBackendType() === 'cloudflare') {
            const renameRes = await callServerAPIWithStatus('/api/wetalks/users/rename', 'POST', {
              newUsername: newUsername
            });
            if (!renameRes.ok) {
              if (renameRes.status === 401) {
                clearAuthSession();
                DOM.modalUsername.classList.remove('active');
                switchView('auth');
                return;
              }
              if (DOM.usernameChangeError) {
                if (renameRes.status === 404 && getBackendType() === 'cloudflare') {
                  DOM.usernameChangeError.textContent = '旧Cloudflare Workerではユーザー名変更に未対応です（最新のworker.jsをデプロイしてください）。';
                } else {
                  DOM.usernameChangeError.textContent = (renameRes.data && renameRes.data.error) || 'このユーザー名は既に使用されているため変更できません。';
                }
                DOM.usernameChangeError.style.display = 'block';
              }
              return;
            }
          } else {
            await loadCachedUsers();
            const conflict = cachedUsers.some(
              u => String(u.username).toLowerCase().trim() === newUsername.toLowerCase() &&
                   String(u.username).toLowerCase().trim() !== oldUsername.toLowerCase()
            );
            if (conflict) {
              if (DOM.usernameChangeError) {
                DOM.usernameChangeError.textContent = 'このユーザー名は既に使用されています。';
                DOM.usernameChangeError.style.display = 'block';
              }
              return;
            }

            if (supabaseClient && !hasSupabaseUsersTableError) {
              try {
                await supabaseClient
                  .from('wetalks_users')
                  .update({ username: newUsername })
                  .eq('username', oldUsername);
              } catch(e) {}
            }

            const renameRes = await callServerAPIWithStatus('/api/wetalks/users/rename', 'POST', {
              oldUsername: oldUsername,
              newUsername: newUsername
            });
            if (!renameRes.ok) {
              if (DOM.usernameChangeError) {
                DOM.usernameChangeError.textContent = (renameRes.data && renameRes.data.error) || 'このユーザー名は既に使用されています。';
                DOM.usernameChangeError.style.display = 'block';
              }
              return;
            }
          }

          // Update local DB messages & direct rooms for this authenticated user
          try {
            const db = getLocalDB();
            if (db && db.messages) {
              Object.keys(db.messages).forEach(rId => {
                (db.messages[rId] || []).forEach(m => {
                  if (m && m.sender === oldUsername) m.sender = newUsername;
                  if (m && m.reply_to && m.reply_to.sender === oldUsername) m.reply_to.sender = newUsername;
                  if (m && Array.isArray(m.read_by) && m.read_by.includes(oldUsername)) {
                    m.read_by = Array.from(new Set(m.read_by.map(rb => (rb === oldUsername ? newUsername : rb)).filter(rb => rb && rb !== m.sender)));
                  }
                });
              });
            }
            if (db && Array.isArray(db.rooms)) {
              db.rooms.forEach(r => {
                if (r && r.created_by === oldUsername) r.created_by = newUsername;
                if (r && Array.isArray(r.members)) {
                  r.members = Array.from(new Set(r.members.map(m => (m === oldUsername ? newUsername : m))));
                }
                if (r && r.type === 'direct' && r.name) {
                  const parts = r.name.replace(/@/g, '').split(' & ');
                  if (parts.length === 2 && (parts[0] === oldUsername || parts[1] === oldUsername)) {
                    const updatedParts = parts.map(p => (p === oldUsername ? newUsername : p)).sort();
                    r.name = '@' + updatedParts[0] + ' & @' + updatedParts[1];
                  }
                }
              });
            }
            saveLocalDB(db);
          } catch(e) {}

          setAuthSession(newUsername, getAuthToken());
          activeUsername = newUsername;
          await loadCachedUsers();
          syncServerPresence();
        }

        if (selectedAvatarBase64) {
          try {
            if (supabaseClient && !hasSupabaseUsersTableError) {
              const { error } = await supabaseClient
                .from('wetalks_users')
                .update({ avatar_base64: selectedAvatarBase64 })
                .eq('username', activeUsername);
              if (error) {
                await callServerAPI('/api/wetalks/users/avatar', 'POST', { username: activeUsername, avatar_base64: selectedAvatarBase64 });
              }
            } else {
              await callServerAPI('/api/wetalks/users/avatar', 'POST', { username: activeUsername, avatar_base64: selectedAvatarBase64 });
            }
            await loadCachedUsers();
          } catch(e) {
            console.error(e);
          }
          selectedAvatarBase64 = null;
        }
        DOM.modalUsername.classList.remove('active');
        renderedRoomIdsHash = '';
        renderLobby();
      }

      DOM.btnUsernameConfirm.addEventListener('click', saveProfileChanges);
      DOM.inputNewUsername.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveProfileChanges();
      });

      if (DOM.btnAuthUseCf) {
        DOM.btnAuthUseCf.addEventListener('click', () => {
          switchActiveBackend('cloudflare', DEFAULT_CF_URL);
          handleAuthSubmit();
        });
      }
      if (DOM.btnAuthUseInternal) {
        DOM.btnAuthUseInternal.addEventListener('click', () => {
          switchActiveBackend('internal');
          handleAuthSubmit();
        });
      }

      // Logout handler
      DOM.btnLogout.addEventListener('click', () => {
        if (typeof leaveVideoCall === 'function') leaveVideoCall(true);
        sendOfflinePresence(false);
        clearAuthSession();
        pendingCreatedRooms.clear();
        unreadCounts = {};
        serverOnlineUsers = [];
        serverRoomMembers = [];
        renderedRoomIdsHash = '';
        DOM.modalUsername.classList.remove('active');
        selectedAvatarBase64 = null;
        if (DOM.authPassword) DOM.authPassword.type = 'password';
        if (DOM.btnToggleAuthPass) DOM.btnToggleAuthPass.textContent = '👁️';
        if (DOM.authError) DOM.authError.style.display = 'none';
        hideAuthConnHelper();
        stopLocalPresence();
        switchView('auth');
      });

      window.addEventListener('pagehide', () => {
        if (typeof leaveVideoCall === 'function') leaveVideoCall(true);
        if (getSessionUser() !== 'ゲスト') {
          sendOfflinePresence(true);
        }
      });

      // Provider tab switches
      if (DOM.tabProviderCf) {
        DOM.tabProviderCf.addEventListener('click', () => updateSettingsTabsUI('cloudflare'));
      }
      if (DOM.tabProviderSupabase) {
        DOM.tabProviderSupabase.addEventListener('click', () => updateSettingsTabsUI('supabase'));
      }
      if (DOM.tabProviderInternal) {
        DOM.tabProviderInternal.addEventListener('click', () => updateSettingsTabsUI('internal'));
      }

      // Cloudflare Connection Test Button
      if (DOM.btnCfTest) {
        DOM.btnCfTest.addEventListener('click', async () => {
          let testUrl = (DOM.inputCfUrl.value || '').trim();
          if (!testUrl) {
            if (DOM.cfTestResult) {
              DOM.cfTestResult.style.display = 'block';
              DOM.cfTestResult.style.color = '#e11d48';
              DOM.cfTestResult.textContent = '❌ Cloudflare Worker の URL を入力してください';
            }
            return;
          }
          if (testUrl.endsWith('/')) testUrl = testUrl.slice(0, -1);
          if (DOM.cfTestResult) {
            DOM.cfTestResult.style.display = 'block';
            DOM.cfTestResult.style.color = '#d97706';
            DOM.cfTestResult.textContent = '⏳ 接続テスト中...';
          }
          try {
            const res = await fetch(testUrl + '/api/wetalks/health', { method: 'GET' });
            if (!res.ok) throw new Error('HTTP Status: ' + res.status);
            const data = await res.json();
            if (DOM.cfTestResult) {
              DOM.cfTestResult.style.display = 'block';
              DOM.cfTestResult.style.color = '#16a34a';
              const d1Status = data.hasD1 ? ' (D1 データベース接続OK)' : ' (※D1未バインド/KVモード)';
              DOM.cfTestResult.textContent = '✅ 接続成功: ' + (data.service || 'Worker OK') + d1Status;
            }
          } catch(e) {
            if (DOM.cfTestResult) {
              DOM.cfTestResult.style.display = 'block';
              DOM.cfTestResult.style.color = '#e11d48';
              DOM.cfTestResult.textContent = '❌ 接続失敗: ' + (e.message || 'Worker にアクセスできませんでした。URLとデプロイ状態を確認してください。');
            }
          }
        });
      }

      // Copy SQL button
      if (DOM.btnCopySql && DOM.cfSchemaSql) {
        DOM.btnCopySql.addEventListener('click', () => {
          DOM.cfSchemaSql.select();
          navigator.clipboard.writeText(DOM.cfSchemaSql.value).then(() => {
            DOM.btnCopySql.textContent = '✅ コピーしました！';
            setTimeout(() => { DOM.btnCopySql.textContent = '📋 SQL をコピー'; }, 2000);
          }).catch(() => {
            DOM.btnCopySql.textContent = '全選択しました (Ctrl+C)';
          });
        });
      }

      // Admin dashboard tabs & inspection handlers
      if (DOM.tabAdminUsers) DOM.tabAdminUsers.addEventListener('click', () => switchAdminDashboardTab('users'));
      if (DOM.tabAdminRooms) DOM.tabAdminRooms.addEventListener('click', () => switchAdminDashboardTab('rooms'));
      if (DOM.tabAdminMessages) DOM.tabAdminMessages.addEventListener('click', () => switchAdminDashboardTab('messages'));
      if (DOM.btnAdminInspectActive) {
        DOM.btnAdminInspectActive.addEventListener('click', () => loadAdminOverview('active'));
      }
      if (DOM.btnAdminInspectCf) {
        DOM.btnAdminInspectCf.addEventListener('click', () => loadAdminOverview('cloudflare'));
      }
      if (DOM.btnAdminPruneImages) {
        DOM.btnAdminPruneImages.addEventListener('click', async () => {
          const forceCf = adminInspectMode === 'cloudflare';
          DOM.btnAdminPruneImages.disabled = true;
          DOM.btnAdminPruneImages.textContent = '🧹 削除チェック中...';
          try {
            const res = await callAdminApi('/api/wetalks/admin/prune-images', 'POST', forceCf);
            const count = (res && res.data && typeof res.data.prunedCount === 'number') ? res.data.prunedCount : 0;
            if (DOM.adminStorageStatus) {
              DOM.adminStorageStatus.style.background = '#e0f2fe';
              DOM.adminStorageStatus.style.borderColor = '#7dd3fc';
              DOM.adminStorageStatus.style.color = '#0369a1';
              DOM.adminStorageStatus.textContent = '🧹 10日経過画像のクリーンアップ完了: ' + count + '件の古い画像を削除しました。';
            }
            await loadAdminOverview(adminInspectMode);
          } finally {
            DOM.btnAdminPruneImages.disabled = false;
            DOM.btnAdminPruneImages.textContent = '🧹 10日経過した画像を今すぐチェック・削除';
          }
        });
      }

      // Save Settings
      DOM.btnSaveSettings.addEventListener('click', async () => {
        const prevBackend = getBackendType();
        const backend = selectedBackendSettingTab || getBackendType() || 'cloudflare';
        localStorage.setItem('wetalks_backend_type_v2', backend);
        localStorage.setItem('wetalks_backend_type', backend);

        // Save Cloudflare URL
        const newCfUrl = (DOM.inputCfUrl.value || '').trim();
        if (newCfUrl) {
          localStorage.setItem('wetalks_cloudflare_url', newCfUrl);
        } else {
          localStorage.removeItem('wetalks_cloudflare_url');
        }

        // Save Supabase credentials
        const newUrl = DOM.inputSupabaseUrl.value.trim();
        const newKey = DOM.inputSupabaseKey.value.trim();
        if (newUrl && newKey) {
          localStorage.setItem('wetalks_supabase_url', newUrl);
          localStorage.setItem('wetalks_supabase_key', newKey);
        } else {
          localStorage.removeItem('wetalks_supabase_url');
          localStorage.removeItem('wetalks_supabase_key');
          supabaseClient = null;
        }

        updateActiveBackendBanner();
        renderedRoomIdsHash = '';
        await initSupabase();
        if (prevBackend !== backend) {
          clearAuthSession();
          switchView('auth');
        } else {
          switchView('lobby');
        }
      });

      DOM.btnSend.addEventListener('click', sendMessage);
      DOM.msgInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
      if (DOM.btnImageAttach && DOM.msgImageFile) {
        DOM.btnImageAttach.addEventListener('click', () => {
          DOM.msgImageFile.click();
        });
        DOM.msgImageFile.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          try {
            const compressed = await compressChatImage(file);
            setPendingChatImage(compressed, file.name);
            DOM.msgInput.focus();
          } catch (err) {
            clearPendingChatImage();
            if (DOM.msgImagePreviewName) DOM.msgImagePreviewName.textContent = (err && err.message) || '画像の読み込みに失敗しました。';
          }
        });
      }
      if (DOM.btnClearMsgImage) {
        DOM.btnClearMsgImage.addEventListener('click', clearPendingChatImage);
      }
      if (DOM.msgInput) {
        DOM.msgInput.addEventListener('paste', async (e) => {
          const items = e.clipboardData && e.clipboardData.items;
          if (!items) return;
          for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.startsWith('image/')) {
              const file = items[i].getAsFile();
              if (file) {
                e.preventDefault();
                try {
                  const compressed = await compressChatImage(file);
                  setPendingChatImage(compressed, file.name || 'クリップボード画像');
                } catch (err) {}
              }
              break;
            }
          }
        });
      }
      if (DOM.btnCloseImageViewer && DOM.modalImageViewer) {
        DOM.btnCloseImageViewer.addEventListener('click', () => {
          DOM.modalImageViewer.classList.remove('active');
          if (DOM.imageViewerImg) DOM.imageViewerImg.src = '';
        });
        DOM.modalImageViewer.addEventListener('click', (e) => {
          if (e.target === DOM.modalImageViewer) {
            DOM.modalImageViewer.classList.remove('active');
            if (DOM.imageViewerImg) DOM.imageViewerImg.src = '';
          }
        });
      }
      if (DOM.btnClearReply) {
        DOM.btnClearReply.addEventListener('click', clearPendingReply);
      }
      if (DOM.btnGroupMembers) {
        DOM.btnGroupMembers.addEventListener('click', openGroupMembersModal);
      }
      if (DOM.btnGroupMembersClose && DOM.modalGroupMembers) {
        DOM.btnGroupMembersClose.addEventListener('click', () => DOM.modalGroupMembers.classList.remove('active'));
        DOM.modalGroupMembers.addEventListener('click', (e) => {
          if (e.target === DOM.modalGroupMembers) DOM.modalGroupMembers.classList.remove('active');
        });
      }
      if (DOM.btnGroupInviteConfirm) {
        DOM.btnGroupInviteConfirm.addEventListener('click', confirmInviteMembers);
      }
      if (DOM.btnStartDirectChat) {
        DOM.btnStartDirectChat.addEventListener('click', () => {
          if (currentUserActionTarget) startDirectChatWith(currentUserActionTarget);
        });
      }
      if (DOM.btnUserActionClose && DOM.modalUserAction) {
        DOM.btnUserActionClose.addEventListener('click', () => DOM.modalUserAction.classList.remove('active'));
        DOM.modalUserAction.addEventListener('click', (e) => {
          if (e.target === DOM.modalUserAction) DOM.modalUserAction.classList.remove('active');
        });
      }
      if (DOM.btnCreateSelectAll) {
        DOM.btnCreateSelectAll.addEventListener('click', () => {
          const boxes = Array.from(document.querySelectorAll('.create-group-member-cb'));
          const allChecked = boxes.length > 0 && boxes.every(b => b.checked);
          boxes.forEach(b => { b.checked = !allChecked; });
          DOM.btnCreateSelectAll.textContent = allChecked ? '全員選択' : '選択解除';
        });
      }
      function updateCreateRoomModalFields() {
        if (DOM.createRoomError) DOM.createRoomError.style.display = 'none';
        const type = DOM.selectNewRoomType.value;
        const myName = getSessionUser();
        const otherUsers = (cachedUsers || []).filter(u => u && u.username && u.username !== 'ゲスト' && u.username !== myName);

        if (type === 'direct') {
          DOM.containerRoomName.style.display = 'none';
          if (DOM.containerGroupMembers) DOM.containerGroupMembers.style.display = 'none';
          DOM.containerDirectTarget.style.display = 'flex';
          
          DOM.selectDirectTarget.innerHTML = '';
          if (otherUsers.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '他の登録ユーザーがいません';
            DOM.selectDirectTarget.appendChild(opt);
          } else {
            otherUsers.forEach(u => {
              const opt = document.createElement('option');
              opt.value = u.username;
              opt.textContent = u.username;
              DOM.selectDirectTarget.appendChild(opt);
            });
          }
        } else {
          DOM.containerRoomName.style.display = 'flex';
          if (DOM.containerGroupMembers) DOM.containerGroupMembers.style.display = 'flex';
          DOM.containerDirectTarget.style.display = 'none';

          if (DOM.createGroupMembersList) {
            const previouslyChecked = new Set(
              Array.from(document.querySelectorAll('.create-group-member-cb:checked')).map(el => el.value)
            );
            DOM.createGroupMembersList.innerHTML = '';
            if (otherUsers.length === 0) {
              DOM.createGroupMembersList.innerHTML = '<div style="font-size:12px; color:#64748b; text-align:center; padding:8px;">他の登録ユーザーがまだいません（後からでも招待できます）。</div>';
            } else {
              otherUsers.forEach(u => {
                const row = document.createElement('label');
                row.className = 'member-check-row';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = u.username;
                cb.className = 'create-group-member-cb';
                if (previouslyChecked.has(u.username)) cb.checked = true;
                const img = document.createElement('img');
                img.className = 'member-check-avatar';
                img.src = getAvatarDataUri(u.username);
                const nameSpan = document.createElement('span');
                nameSpan.style.cssText = 'flex:1; font-weight:600; color:#1e293b;';
                nameSpan.textContent = u.username;
                row.appendChild(cb);
                row.appendChild(img);
                row.appendChild(nameSpan);
                DOM.createGroupMembersList.appendChild(row);
              });
            }
          }
          if (DOM.btnCreateSelectAll) DOM.btnCreateSelectAll.textContent = '全員選択';
        }
      }

      DOM.selectNewRoomType.addEventListener('change', updateCreateRoomModalFields);

      DOM.btnOpenCreate.addEventListener('click', () => {
        if (DOM.createRoomError) DOM.createRoomError.style.display = 'none';
        if (DOM.createGroupMembersList) DOM.createGroupMembersList.innerHTML = '';
        DOM.modalCreate.classList.add('active');
        updateCreateRoomModalFields();
        if (DOM.selectNewRoomType.value === 'group') {
          setTimeout(() => DOM.inputNewRoomName.focus(), 50);
        }
        // Background reload users if any new user joined
        loadCachedUsers().then(() => updateCreateRoomModalFields()).catch(() => {});
      });
      DOM.btnCreateCancel.addEventListener('click', () => DOM.modalCreate.classList.remove('active'));
      DOM.btnCreateConfirm.addEventListener('click', createRoom);
      DOM.inputNewRoomName.addEventListener('keydown', e => { if (e.key === 'Enter') createRoom(); });

      window.addEventListener('storage', e => {
        if (e.key === DB_KEY) {
          try {
            const db = JSON.parse(e.newValue || localStorage.getItem(DB_KEY));
            const me = getSessionUser();
            if (db && db.messages && me && me !== 'ゲスト') {
              Object.keys(db.messages).forEach(roomId => {
                const roomObj = Array.isArray(db.rooms) ? db.rooms.find(r => r && r.id === roomId) : null;
                if (roomObj && isUserInRoom(roomObj, me)) {
                  db.messages[roomId].forEach(msg => {
                    checkAndNotifyNewMessage(msg);
                  });
                }
              });
            }
          } catch(err){}
          if (currentView === 'lobby') renderLobby();
          else if (currentView === 'chat') updateReadReceipts();
        }
        if (e.key === ACTIVE_USERS_KEY) updateReadReceipts();
        if (e.key === READ_PING_KEY && e.newValue) {
          try {
            const evt = JSON.parse(e.newValue);
            if (evt && evt.roomId && currentView === 'chat' && activeRoomId === evt.roomId && evt.user !== getSessionUser()) {
              pollActiveRoomMessages();
            } else if (currentView === 'lobby') {
              pollBackgroundOtherRooms(true);
            }
          } catch(err) {}
        }
      });

      // =========================================================================
      // Discord-Style 360p Ultra-Low-Latency Lightweight WebRTC Video Call Engine
      // =========================================================================
      const CALL_VIDEO_CONSTRAINTS = {
        width: { ideal: 640, max: 640 },
        height: { ideal: 360, max: 360 },
        frameRate: { ideal: 24, max: 24 },
        resizeMode: 'crop-and-scale'
      };
      const CALL_AUDIO_CONSTRAINTS = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 }
      };
      const CALL_RTC_CONFIG = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ],
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 4
      };

      const callState = {
        active: false,
        joining: false,
        roomId: null,
        peerId: getClientId(),
        username: '',
        camOn: true,
        micOn: false,
        deafened: false,
        collapsed: false,
        expanded: false,
        focusedPeerId: null,
        audioPlayBlocked: false,
        localStream: null,
        localVideoTrack: null,
        localAudioTrack: null,
        peers: new Map(),      // peerId -> { peerId, username, camOn, micOn, pc, stream, audioStream, audioEl, pendingCandidates, tileEl, videoEl, camBadgeEl, labelEl, iceWatchdogTimer, useWsAudioFallback }
        rostersByRoom: new Map(), // roomId -> [{ peerId, username, camOn, micOn }]
        audioCtx: null,
        analysers: new Map(),  // peerId -> { analyser, source }
        vadTimer: null,
        vadBuf: null,
        wsAudioFallbackActive: false,
        wsAudioSource: null,
        wsAudioProc: null,
        wsAudioGain: null,
        wsAudioPlayBuffers: new Map(),
        wsAudioPlayProc: null,
        wsAudioPlayIdle: null,
        wsAudioPlayOutGain: null,
        statsTimer: null
      };

      let callBc = null;
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          callBc = new BroadcastChannel('wetalks_rtc_sync');
        }
      } catch (e) {}

      function setCallNotice(msg) {
        if (!DOM.callNotice) return;
        if (msg) {
          DOM.callNotice.textContent = msg;
          DOM.callNotice.classList.add('active');
        } else {
          DOM.callNotice.textContent = '';
          DOM.callNotice.classList.remove('active');
        }
      }

      function sendCallWs(payload) {
        if (internalWs && internalWs.readyState === WebSocket.OPEN) {
          try {
            internalWs.send(JSON.stringify(payload));
            return true;
          } catch (e) {}
        }
        if (callBc) {
          try {
            callBc.postMessage({ ...payload, _viaBc: true, fromPeerId: callState.peerId });
            return true;
          } catch (e) {}
        }
        return false;
      }

      function probeRoomCallStatus(roomId) {
        if (!roomId) return;
        if (internalWs && internalWs.readyState === WebSocket.OPEN) {
          try {
            internalWs.send(JSON.stringify({ type: 'wetalks_call_probe', roomId: String(roomId) }));
          } catch (e) {}
        } else {
          connectInternalWetalksWs();
        }
        if (callBc && callState.active && callState.roomId === roomId) {
          try {
            callBc.postMessage({
              type: 'wetalks_call_bc_roster',
              roomId: callState.roomId,
              peer: {
                peerId: callState.peerId,
                username: callState.username || getSessionUser(),
                camOn: callState.camOn,
                micOn: callState.micOn
              }
            });
          } catch (e) {}
        }
      }

      function tuneLowLatencySdp(sdp) {
        if (!sdp) return sdp;
        try {
          const crlf = String.fromCharCode(13, 10);
          const sep = sdp.indexOf(crlf) !== -1 ? crlf : String.fromCharCode(10);
          const lines = sdp.split(sep);
          let opusPt = null;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.indexOf('a=rtpmap:') === 0 && line.toLowerCase().indexOf('opus/48000') !== -1) {
              const spaceIdx = line.indexOf(' ');
              if (spaceIdx > 9) {
                opusPt = line.slice(9, spaceIdx);
                break;
              }
            }
          }
          if (!opusPt) return sdp;
          let fmtpFound = false;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('a=fmtp:' + opusPt + ' ')) {
              fmtpFound = true;
              if (!lines[i].includes('minptime=')) lines[i] += ';minptime=10';
              if (!lines[i].includes('useinbandfec=')) lines[i] += ';useinbandfec=1';
              if (!lines[i].includes('usedtx=')) lines[i] += ';usedtx=0';
              if (!lines[i].includes('maxaveragebitrate=')) lines[i] += ';maxaveragebitrate=96000';
              if (!lines[i].includes('maxplaybackrate=')) lines[i] += ';maxplaybackrate=48000';
              if (!lines[i].includes('sprop-maxcapturerate=')) lines[i] += ';sprop-maxcapturerate=48000';
              break;
            }
          }
          if (!fmtpFound) {
            lines.push('a=fmtp:' + opusPt + ' minptime=10;useinbandfec=1;usedtx=0;maxaveragebitrate=96000;maxplaybackrate=48000;sprop-maxcapturerate=48000');
          }
          return lines.join(sep);
        } catch (e) {
          return sdp;
        }
      }

      async function applyLowLatencySenderParams(pc) {
        if (!pc || typeof pc.getSenders !== 'function') return;
        const senders = pc.getSenders();
        for (const sender of senders) {
          if (!sender || !sender.track || typeof sender.getParameters !== 'function' || typeof sender.setParameters !== 'function') continue;
          try {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            if (sender.track.kind === 'video') {
              params.degradationPreference = 'maintain-framerate';
              params.encodings[0].maxBitrate = 380000; // 380kbps crisp 360p low latency
              params.encodings[0].maxFramerate = 24;
              try { params.encodings[0].priority = 'medium'; params.encodings[0].networkPriority = 'medium'; } catch (e) {}
            } else if (sender.track.kind === 'audio') {
              params.encodings[0].maxBitrate = 96000; // 96kbps crisp fullband Discord-grade Opus voice
              try { params.encodings[0].priority = 'high'; params.encodings[0].networkPriority = 'high'; } catch (e) {}
            }
            await sender.setParameters(params);
          } catch (e) {}
        }
      }

      function updateCallGridLayoutClasses() {
        if (!DOM.callVideoGrid) return;
        const count = DOM.callVideoGrid.children.length;
        DOM.callVideoGrid.classList.toggle('single-tile', count <= 1);
      }

      function updateCallControlsUI() {
        const active = callState.active;
        if (DOM.videoCallStage) {
          DOM.videoCallStage.classList.toggle('active', active);
          DOM.videoCallStage.classList.toggle('collapsed', callState.collapsed);
          DOM.videoCallStage.classList.toggle('expanded', callState.expanded);
        }
        if (DOM.btnVideoCall) {
          DOM.btnVideoCall.classList.toggle('in-call', active);
          DOM.btnVideoCall.textContent = active ? '📞 通話中' : '📹 通話';
        }
        if (DOM.callStatusLabel) {
          const total = active ? (1 + callState.peers.size) : 0;
          let statusPrefix = '通話中';
          if (active) {
            if (callState.peers.size === 0) {
              statusPrefix = '通話中 (相手待機中)';
            } else {
              const peerList = Array.from(callState.peers.values());
              const anyRtcAudio = peerList.some(p => p.rtcAudioReceiving);
              const anyRtcConnected = peerList.some(p => p.pc && (p.pc.iceConnectionState === 'connected' || p.pc.iceConnectionState === 'completed'));
              const anyWsFallback = peerList.some(p => p.useWsAudioFallback);
              if (anyRtcAudio || (anyRtcConnected && !anyWsFallback)) {
                statusPrefix = 'P2P通話中';
              } else if (anyWsFallback) {
                statusPrefix = '中継音声通話';
              } else {
                statusPrefix = '接続中...';
              }
            }
          }
          DOM.callStatusLabel.textContent = active ? (statusPrefix + ' · ' + total + '人') : '未接続';
        }
        if (DOM.btnCallCollapse) {
          DOM.btnCallCollapse.textContent = callState.collapsed ? '▸ 表示' : '▾ 最小化';
        }
        if (DOM.btnCallExpand) {
          DOM.btnCallExpand.textContent = callState.expanded ? '🗗 標準' : '⛶ 拡大';
        }
        if (DOM.btnCallCam) {
          DOM.btnCallCam.className = 'call-ctrl-btn ' + (callState.camOn ? 'active-on' : 'off');
          DOM.btnCallCam.textContent = callState.camOn ? '📹 カメラ ON' : '📹 カメラ OFF';
        }
        if (DOM.btnCallMic) {
          DOM.btnCallMic.className = 'call-ctrl-btn ' + (callState.micOn ? 'active-on' : 'off');
          DOM.btnCallMic.textContent = callState.micOn ? '🎙️ マイク ON' : '🔇 ミュート中';
        }
        if (DOM.btnCallDeafen) {
          DOM.btnCallDeafen.className = 'call-ctrl-btn ' + (callState.deafened ? 'off' : '');
          DOM.btnCallDeafen.textContent = callState.deafened ? '🔇 受信ミュート' : '🔊 音声受信 ON';
        }
      }

      function updateRoomCallBanner() {
        if (!DOM.roomCallBanner) return;
        if (currentView !== 'chat' || !activeRoomId || callState.active) {
          DOM.roomCallBanner.classList.remove('active');
          return;
        }
        const roster = (callState.rostersByRoom.get(activeRoomId) || []).filter(p => p && p.peerId !== callState.peerId);
        if (roster.length === 0) {
          DOM.roomCallBanner.classList.remove('active');
          return;
        }
        const names = roster.map(p => p.username).filter(Boolean).slice(0, 3).join(', ');
        if (DOM.roomCallBannerText) {
          DOM.roomCallBannerText.textContent = '通話中 (' + roster.length + '人)' + (names ? ': ' + names : '');
        }
        DOM.roomCallBanner.classList.add('active');
      }

      function buildCallTile(peerId, username, isLocal, camOn, micOn) {
        const tile = document.createElement('div');
        tile.className = 'call-tile' + (isLocal ? ' is-local' : '') + (camOn ? '' : ' cam-off');
        tile.setAttribute('data-peerid', peerId);

        const videoEl = document.createElement('video');
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true; // Video elements stay muted so autoplay always succeeds; remote audio uses dedicated audioEl
        videoEl.setAttribute('playsinline', '');

        const fallback = document.createElement('div');
        fallback.className = 'call-avatar-fallback';
        const avatarImg = document.createElement('img');
        avatarImg.className = 'call-avatar-img';
        avatarImg.src = getAvatarDataUri(username);
        avatarImg.alt = username;
        fallback.appendChild(avatarImg);

        const camBadge = document.createElement('div');
        camBadge.className = 'call-tile-cam-badge';
        camBadge.textContent = camOn ? '360p' : '音声のみ';

        const labelEl = document.createElement('div');
        labelEl.className = 'call-tile-label';
        labelEl.textContent = (micOn ? '' : '🔇 ') + username + (isLocal ? ' (自分)' : '');

        tile.appendChild(videoEl);
        tile.appendChild(fallback);
        tile.appendChild(camBadge);
        tile.appendChild(labelEl);

        tile.addEventListener('click', () => {
          const isFocused = callState.focusedPeerId === peerId;
          callState.focusedPeerId = isFocused ? null : peerId;
          if (DOM.callVideoGrid) {
            Array.from(DOM.callVideoGrid.children).forEach(el => {
              el.classList.toggle('focused', !isFocused && el.getAttribute('data-peerid') === peerId);
            });
          }
        });

        return { tile, videoEl, camBadge, labelEl };
      }

      function ensureLocalCallTile() {
        if (!DOM.callVideoGrid) return;
        let tile = DOM.callVideoGrid.querySelector('[data-peerid="' + callState.peerId + '"]');
        if (!tile) {
          const built = buildCallTile(callState.peerId, callState.username || getSessionUser(), true, callState.camOn, callState.micOn);
          tile = built.tile;
          DOM.callVideoGrid.insertBefore(tile, DOM.callVideoGrid.firstChild);
          updateCallGridLayoutClasses();
        }
        const videoEl = tile.querySelector('video');
        const camBadge = tile.querySelector('.call-tile-cam-badge');
        const labelEl = tile.querySelector('.call-tile-label');
        tile.classList.toggle('cam-off', !callState.camOn);
        if (camBadge) camBadge.textContent = callState.camOn ? '360p' : '音声のみ';
        if (labelEl) labelEl.textContent = (callState.micOn ? '' : '🔇 ') + (callState.username || getSessionUser()) + ' (自分)';
        if (videoEl) {
          if (callState.camOn && callState.localVideoTrack) {
            const previewStream = new MediaStream([callState.localVideoTrack]);
            videoEl.srcObject = previewStream;
            videoEl.play().catch(() => {});
          } else {
            videoEl.srcObject = null;
          }
        }
      }

      function updatePeerTileVisuals(peerObj) {
        if (!peerObj || !peerObj.tileEl) return;
        const hasLiveVideo = Boolean(
          peerObj.camOn &&
          peerObj.stream &&
          peerObj.stream.getVideoTracks().some(t => t.readyState === 'live' && !t.muted)
        );
        const showVideo = Boolean(peerObj.camOn && peerObj.stream && peerObj.stream.getVideoTracks().length > 0 && hasLiveVideo);
        peerObj.tileEl.classList.toggle('cam-off', !showVideo);
        if (peerObj.camBadgeEl) peerObj.camBadgeEl.textContent = showVideo ? '360p' : '音声のみ';
        if (peerObj.labelEl) peerObj.labelEl.textContent = (peerObj.micOn ? '' : '🔇 ') + peerObj.username;
      }

      function ensureCallAudioCtx() {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return null;
          if (!callState.audioCtx || callState.audioCtx.state === 'closed') {
            try {
              callState.audioCtx = new Ctx({ latencyHint: 'interactive', sampleRate: 48000 });
            } catch (e1) {
              callState.audioCtx = new Ctx();
            }
          }
          if (callState.audioCtx.state === 'suspended') {
            callState.audioCtx.resume().catch(() => {});
          }
          return callState.audioCtx;
        } catch (e) {
          return null;
        }
      }

      function attachAnalyserForPeer(peerId, stream) {
        if (!stream || stream.getAudioTracks().length === 0) return;
        try {
          const ctx = ensureCallAudioCtx();
          if (!ctx) return;
          const prev = callState.analysers.get(peerId);
          if (prev && prev.source) {
            try { prev.source.disconnect(); } catch (e) {}
          }
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.45;
          source.connect(analyser);
          callState.analysers.set(peerId, { analyser, source });
          if (!callState.vadBuf) callState.vadBuf = new Uint8Array(analyser.frequencyBinCount);
          if (!callState.vadTimer) {
            callState.vadTimer = setInterval(() => {
              if (!callState.active || callState.analysers.size === 0) return;
              const buf = callState.vadBuf;
              callState.analysers.forEach((entry, pid) => {
                const isSelf = pid === callState.peerId;
                const peerObj = isSelf ? null : callState.peers.get(pid);
                const isMicActive = isSelf ? callState.micOn : (peerObj ? peerObj.micOn : false);
                const tileEl = isSelf
                  ? (DOM.callVideoGrid && DOM.callVideoGrid.querySelector('[data-peerid="' + callState.peerId + '"]'))
                  : (peerObj && peerObj.tileEl);
                if (!tileEl) return;
                if (!isMicActive) {
                  tileEl.classList.remove('speaking');
                  return;
                }
                entry.analyser.getByteFrequencyData(buf);
                let sum = 0;
                for (let i = 0; i < buf.length; i++) sum += buf[i];
                const avg = sum / buf.length;
                tileEl.classList.toggle('speaking', avg > 12);
              });
            }, 140);
          }
        } catch (e) {}
      }

      function ensureCallAudioSink() {
        let sink = document.getElementById('call-audio-sink');
        if (!sink) {
          sink = document.createElement('div');
          sink.id = 'call-audio-sink';
          sink.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none;overflow:hidden;';
          document.body.appendChild(sink);
        }
        return sink;
      }

      function tryPlayPeerAudio(peerObj) {
        if (!peerObj || !peerObj.audioEl) return;
        peerObj.audioEl.muted = Boolean(callState.deafened);
        peerObj.audioEl.volume = 1;
        const p = peerObj.audioEl.play();
        if (p && typeof p.catch === 'function') {
          p.then(() => {
            if (callState.audioPlayBlocked) {
              callState.audioPlayBlocked = false;
              setCallNotice('');
            }
          }).catch(() => {
            callState.audioPlayBlocked = true;
            setCallNotice('🔇 音声再生がブロックされました。ここをクリック/タップして音声を有効にしてください。');
          });
        }
      }

      function unlockBlockedCallAudio() {
        if (!callState.active) return;
        ensureCallAudioCtx();
        callState.peers.forEach(peerObj => {
          if (peerObj.audioEl && peerObj.audioStream && peerObj.audioStream.getAudioTracks().length > 0) {
            tryPlayPeerAudio(peerObj);
          }
        });
      }

      function needsWsAudioFallback() {
        if (!callState.active || callState.peers.size === 0) return false;
        for (const p of callState.peers.values()) {
          if (p.useWsAudioFallback || p.peerRequestedWsAudio) return true;
        }
        return false;
      }

      function stopAudioWsFallback(force = false) {
        if (!force && needsWsAudioFallback()) return;
        callState.wsAudioFallbackActive = false;
        if (callState.wsAudioProc) {
          try { callState.wsAudioProc.disconnect(); } catch (e) {}
          callState.wsAudioProc.onaudioprocess = null;
          callState.wsAudioProc = null;
        }
        if (callState.wsAudioGain) {
          try { callState.wsAudioGain.disconnect(); } catch (e) {}
          callState.wsAudioGain = null;
        }
        if (callState.wsAudioSource) {
          try { callState.wsAudioSource.disconnect(); } catch (e) {}
          callState.wsAudioSource = null;
        }
      }

      function stopWsAudioPlaybackNode() {
        if (callState.wsAudioPlayProc) {
          try { callState.wsAudioPlayProc.disconnect(); } catch (e) {}
          callState.wsAudioPlayProc.onaudioprocess = null;
          callState.wsAudioPlayProc = null;
        }
        if (callState.wsAudioPlayIdle) {
          try { callState.wsAudioPlayIdle.disconnect(); } catch (e) {}
          callState.wsAudioPlayIdle = null;
        }
        if (callState.wsAudioPlayOutGain) {
          try { callState.wsAudioPlayOutGain.disconnect(); } catch (e) {}
          callState.wsAudioPlayOutGain = null;
        }
      }

      function ensureWsAudioPlaybackNode() {
        const ctx = ensureCallAudioCtx();
        if (!ctx) return null;
        if (callState.wsAudioPlayProc) return ctx;
        try {
          const proc = ctx.createScriptProcessor(1024, 1, 1);
          const idleGain = ctx.createGain();
          idleGain.gain.value = 0;

          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 85;
          hp.Q.value = 0.7;

          const presence = ctx.createBiquadFilter();
          presence.type = 'peaking';
          presence.frequency.value = 2800;
          presence.Q.value = 0.9;
          presence.gain.value = 2.0;

          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -18;
          comp.knee.value = 12;
          comp.ratio.value = 4;
          comp.attack.value = 0.004;
          comp.release.value = 0.12;

          const outGain = ctx.createGain();
          outGain.gain.value = callState.deafened ? 0 : 1.15;

          const outRate = ctx.sampleRate || 48000;
          const prebufferSamples = Math.floor(outRate * 0.055);
          const fadeInTotal = Math.max(48, Math.floor(outRate * 0.004));

          proc.onaudioprocess = (ev) => {
            const out = ev.outputBuffer.getChannelData(0);
            out.fill(0);
            if (!callState.active || callState.deafened || callState.wsAudioPlayBuffers.size === 0) return;

            callState.wsAudioPlayBuffers.forEach((pb) => {
              if (!pb || pb.count === 0) {
                if (pb && pb.started && Math.abs(pb.lastOutSample) > 0.0001) {
                  let s = pb.lastOutSample;
                  for (let i = 0; i < out.length; i++) {
                    s *= 0.92;
                    out[i] += s;
                  }
                  pb.lastOutSample = 0;
                  pb.started = false;
                }
                return;
              }
              if (!pb.started) {
                if (pb.count < prebufferSamples) return;
                pb.started = true;
                pb.fadeInRem = fadeInTotal;
              }
              const n = Math.min(out.length, pb.count);
              const cap = pb.ring.length;
              for (let i = 0; i < n; i++) {
                let v = pb.ring[pb.readIdx];
                pb.readIdx = (pb.readIdx + 1) % cap;
                if (pb.fadeInRem > 0) {
                  const g = (fadeInTotal - pb.fadeInRem + 1) / fadeInTotal;
                  v *= g;
                  pb.fadeInRem--;
                }
                pb.lastOutSample = v;
                out[i] += v;
              }
              pb.count -= n;
              if (n < out.length) {
                let tail = pb.lastOutSample;
                for (let i = n; i < out.length; i++) {
                  tail *= 0.92;
                  out[i] += tail;
                }
                pb.lastOutSample = 0;
                pb.started = false;
              }
            });

            for (let i = 0; i < out.length; i++) {
              const x = out[i];
              if (x > 0.92 || x < -0.92) out[i] = Math.tanh(x);
            }
          };

          idleGain.connect(proc);
          proc.connect(hp);
          hp.connect(presence);
          presence.connect(comp);
          comp.connect(outGain);
          outGain.connect(ctx.destination);

          callState.wsAudioPlayIdle = idleGain;
          callState.wsAudioPlayProc = proc;
          callState.wsAudioPlayOutGain = outGain;
          return ctx;
        } catch (e) {
          return null;
        }
      }

      function startAudioWsFallback() {
        if (!callState.active || !needsWsAudioFallback()) return;
        if (callState.wsAudioFallbackActive && callState.wsAudioProc) return;
        if (!callState.localAudioTrack || callState.localAudioTrack.readyState !== 'live') return;
        try {
          const ctx = ensureCallAudioCtx();
          if (!ctx) return;
          const source = ctx.createMediaStreamSource(new MediaStream([callState.localAudioTrack]));
          const proc = ctx.createScriptProcessor(1024, 1, 1);
          const inRate = ctx.sampleRate || 48000;
          const targetRate = 32000;
          const ratio = Math.max(1, inRate / targetRate);
          let prevRaw = 0;
          let prevPrevRaw = 0;
          let hangoverFrames = 0;
          let wasGated = true;

          proc.onaudioprocess = (ev) => {
            if (!callState.active || !callState.micOn || !needsWsAudioFallback()) {
              wasGated = true;
              hangoverFrames = 0;
              return;
            }
            if (!callState.localAudioTrack || !callState.localAudioTrack.enabled || callState.localAudioTrack.readyState !== 'live') {
              wasGated = true;
              hangoverFrames = 0;
              return;
            }
            const input = ev.inputBuffer.getChannelData(0);
            let peak = 0;
            for (let i = 0; i < input.length; i++) {
              const a = input[i] < 0 ? -input[i] : input[i];
              if (a > peak) peak = a;
            }
            if (peak >= 0.0007) {
              hangoverFrames = 14;
            } else if (hangoverFrames > 0) {
              hangoverFrames--;
            } else {
              wasGated = true;
              prevPrevRaw = input[input.length - 2] || 0;
              prevRaw = input[input.length - 1] || 0;
              return;
            }

            // 3-tap low-pass anti-aliasing prefilter + linear interpolation to 32kHz
            const filtered = new Float32Array(input.length);
            for (let i = 0; i < input.length; i++) {
              const s0 = i >= 2 ? input[i - 2] : (i === 1 ? prevRaw : prevPrevRaw);
              const s1 = i >= 1 ? input[i - 1] : prevRaw;
              const s2 = input[i];
              filtered[i] = 0.2 * s0 + 0.6 * s1 + 0.2 * s2;
            }
            prevPrevRaw = input[input.length - 2] || 0;
            prevRaw = input[input.length - 1] || 0;

            const outLen = Math.max(1, Math.floor(input.length / ratio));
            const pcm16 = new Int16Array(outLen);
            const fadeSamples = Math.min(64, outLen);
            for (let i = 0; i < outLen; i++) {
              const pos = i * ratio;
              const idx = Math.floor(pos);
              const frac = pos - idx;
              const a = filtered[idx] || 0;
              const b = filtered[Math.min(filtered.length - 1, idx + 1)] || a;
              let s = a + (b - a) * frac;
              if (wasGated && i < fadeSamples) {
                s *= (i + 1) / fadeSamples;
              } else if (hangoverFrames === 1 && i >= outLen - fadeSamples) {
                s *= (outLen - i) / fadeSamples;
              }
              s = Math.max(-1, Math.min(1, s));
              pcm16[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
            }
            wasGated = (hangoverFrames === 1);

            const bytes = new Uint8Array(pcm16.buffer);
            let bin = '';
            for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
            const b64 = btoa(bin);
            for (const p of callState.peers.values()) {
              if (!p.useWsAudioFallback && !p.peerRequestedWsAudio) continue;
              sendCallWs({
                type: 'wetalks_call_audio',
                roomId: callState.roomId,
                fromPeerId: callState.peerId,
                targetPeerId: p.peerId,
                sampleRate: targetRate,
                pcm: b64
              });
            }
          };

          const silentGain = ctx.createGain();
          silentGain.gain.value = 0.0001;
          source.connect(proc);
          proc.connect(silentGain);
          silentGain.connect(ctx.destination);
          callState.wsAudioSource = source;
          callState.wsAudioProc = proc;
          callState.wsAudioGain = silentGain;
          callState.wsAudioFallbackActive = true;
        } catch (e) {}
      }

      function handleIncomingCallAudioPcm(fromPeerId, sampleRate, pcmBase64) {
        if (!callState.active || callState.deafened || !pcmBase64) return;
        const peerObj = callState.peers.get(fromPeerId);
        if (peerObj && peerObj.rtcAudioReceiving) {
          return; // Confirmed real RTP audio packets are flowing; avoid double audio
        }
        try {
          const ctx = ensureWsAudioPlaybackNode();
          if (!ctx) return;
          const bin = atob(pcmBase64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const pcm16 = new Int16Array(bytes.buffer);
          if (pcm16.length === 0) return;

          const inRate = Math.max(8000, Math.min(48000, Number(sampleRate) || 32000));
          const outRate = ctx.sampleRate || 48000;
          let pb = callState.wsAudioPlayBuffers.get(fromPeerId);
          if (!pb) {
            pb = {
              ring: new Float32Array(Math.max(24000, outRate)),
              readIdx: 0,
              writeIdx: 0,
              count: 0,
              started: false,
              fadeInRem: 0,
              lastInSample: 0,
              lastOutSample: 0
            };
            callState.wsAudioPlayBuffers.set(fromPeerId, pb);
          }

          let peak = 0;
          const inFloats = new Float32Array(pcm16.length + 1);
          inFloats[0] = pb.lastInSample;
          for (let i = 0; i < pcm16.length; i++) {
            const v = pcm16[i] / 32768;
            inFloats[i + 1] = v;
            const av = v < 0 ? -v : v;
            if (av > peak) peak = av;
          }
          pb.lastInSample = inFloats[pcm16.length];

          const outCount = Math.max(1, Math.round((pcm16.length * outRate) / inRate));
          const step = pcm16.length / outCount;
          const cap = pb.ring.length;
          const maxHold = Math.floor(outRate * 0.25);
          const targetHold = Math.floor(outRate * 0.075);

          for (let i = 0; i < outCount; i++) {
            const pos = i * step;
            const idx = Math.floor(pos);
            const frac = pos - idx;
            const s0 = inFloats[Math.min(inFloats.length - 1, idx)];
            const s1 = inFloats[Math.min(inFloats.length - 1, idx + 1)];
            pb.ring[pb.writeIdx] = s0 + (s1 - s0) * frac;
            pb.writeIdx = (pb.writeIdx + 1) % cap;
            if (pb.count < cap) {
              pb.count++;
            } else {
              pb.readIdx = (pb.readIdx + 1) % cap;
            }
          }
          if (pb.count > maxHold) {
            const drop = pb.count - targetHold;
            pb.readIdx = (pb.readIdx + drop) % cap;
            pb.count -= drop;
          }

          if (peerObj && peerObj.tileEl && peerObj.micOn) {
            peerObj.tileEl.classList.toggle('speaking', peak > 0.015);
          }
        } catch (e) {}
      }

      function ensureCallStatsMonitor() {
        if (callState.statsTimer) return;
        callState.statsTimer = setInterval(async () => {
          if (!callState.active || callState.peers.size === 0) return;
          const now = Date.now();
          let statusChanged = false;
          for (const [pid, peerObj] of callState.peers.entries()) {
            if (!peerObj || !peerObj.pc) continue;
            try {
              const stats = await peerObj.pc.getStats();
              let bytesRecv = 0;
              let audioLevel = 0;
              stats.forEach(report => {
                if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                  bytesRecv += Number(report.bytesReceived || 0);
                  if (typeof report.audioLevel === 'number') audioLevel = Math.max(audioLevel, report.audioLevel);
                } else if (report.type === 'media-source' && report.kind === 'audio') {
                  // ignore local
                }
              });
              if (bytesRecv > peerObj.lastAudioBytesReceived) {
                peerObj.lastAudioBytesReceived = bytesRecv;
                if (!peerObj.rtcAudioReceiving) {
                  peerObj.rtcAudioReceiving = true;
                  peerObj.useWsAudioFallback = false;
                  statusChanged = true;
                  stopAudioWsFallback(false);
                }
                if (peerObj.tileEl) {
                  peerObj.tileEl.classList.toggle('speaking', Boolean(peerObj.micOn && audioLevel > 0.015));
                }
              } else if (now - peerObj.joinedAt > 3200) {
                const ice = peerObj.pc.iceConnectionState;
                const needFallback = (ice !== 'connected' && ice !== 'completed') || (peerObj.micOn && !peerObj.rtcAudioReceiving);
                if (needFallback && !peerObj.useWsAudioFallback) {
                  peerObj.useWsAudioFallback = true;
                  statusChanged = true;
                  startAudioWsFallback();
                  sendCallWs({
                    type: 'wetalks_call_need_ws_audio',
                    roomId: callState.roomId,
                    targetPeerId: pid,
                    fromPeerId: callState.peerId
                  });
                }
              }
            } catch (e) {}
          }
          if (statusChanged) updateCallControlsUI();
        }, 1800);
      }

      function removePeerConnection(peerId) {
        const peerObj = callState.peers.get(peerId);
        if (!peerObj) return;
        callState.peers.delete(peerId);
        callState.wsAudioPlayBuffers.delete(peerId);
        if (peerObj.iceWatchdogTimer) {
          clearTimeout(peerObj.iceWatchdogTimer);
          peerObj.iceWatchdogTimer = null;
        }
        const ana = callState.analysers.get(peerId);
        if (ana && ana.source) {
          try { ana.source.disconnect(); } catch (e) {}
        }
        callState.analysers.delete(peerId);
        if (peerObj.pc) {
          try { peerObj.pc.ontrack = null; } catch (e) {}
          try { peerObj.pc.onicecandidate = null; } catch (e) {}
          try { peerObj.pc.oniceconnectionstatechange = null; } catch (e) {}
          try { peerObj.pc.onconnectionstatechange = null; } catch (e) {}
          try { peerObj.pc.close(); } catch (e) {}
        }
        if (peerObj.videoEl) {
          try { peerObj.videoEl.srcObject = null; } catch (e) {}
        }
        if (peerObj.audioEl) {
          try { peerObj.audioEl.pause(); } catch (e) {}
          try { peerObj.audioEl.srcObject = null; } catch (e) {}
          if (peerObj.audioEl.parentNode) peerObj.audioEl.parentNode.removeChild(peerObj.audioEl);
        }
        if (peerObj.tileEl && peerObj.tileEl.parentNode) {
          peerObj.tileEl.parentNode.removeChild(peerObj.tileEl);
        }
        if (callState.focusedPeerId === peerId) callState.focusedPeerId = null;
        stopAudioWsFallback(false);
        updateCallGridLayoutClasses();
        updateCallControlsUI();
      }

      function getOrCreatePeer(peerInfo) {
        const pid = String(peerInfo.peerId || '').trim();
        if (!pid || pid === callState.peerId) return null;
        let existing = callState.peers.get(pid);
        if (existing) {
          if (peerInfo.username) existing.username = peerInfo.username;
          if (typeof peerInfo.camOn === 'boolean') existing.camOn = peerInfo.camOn;
          if (typeof peerInfo.micOn === 'boolean') existing.micOn = peerInfo.micOn;
          updatePeerTileVisuals(existing);
          return existing;
        }

        const built = buildCallTile(pid, peerInfo.username || 'Member', false, Boolean(peerInfo.camOn), peerInfo.micOn !== false);
        if (DOM.callVideoGrid) {
          DOM.callVideoGrid.appendChild(built.tile);
          updateCallGridLayoutClasses();
        }

        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.muted = Boolean(callState.deafened);
        audioEl.volume = 1;
        ensureCallAudioSink().appendChild(audioEl);

        const pc = new RTCPeerConnection(CALL_RTC_CONFIG);
        const peerObj = {
          peerId: pid,
          username: peerInfo.username || 'Member',
          camOn: Boolean(peerInfo.camOn),
          micOn: peerInfo.micOn !== false,
          pc,
          stream: new MediaStream(),
          audioStream: new MediaStream(),
          audioEl,
          pendingCandidates: [],
          makingOffer: false,
          iceWatchdogTimer: null,
          useWsAudioFallback: false,
          peerRequestedWsAudio: false,
          rtcAudioReceiving: false,
          lastAudioBytesReceived: 0,
          joinedAt: Date.now(),
          tileEl: built.tile,
          videoEl: built.videoEl,
          camBadgeEl: built.camBadge,
          labelEl: built.labelEl
        };
        callState.peers.set(pid, peerObj);
        ensureCallStatsMonitor();

        peerObj.iceWatchdogTimer = setTimeout(() => {
          if (!callState.active || !callState.peers.has(pid)) return;
          const st = pc.iceConnectionState;
          if ((st !== 'connected' && st !== 'completed') || (peerObj.micOn && !peerObj.rtcAudioReceiving)) {
            peerObj.useWsAudioFallback = true;
            startAudioWsFallback();
            sendCallWs({
              type: 'wetalks_call_need_ws_audio',
              roomId: callState.roomId,
              targetPeerId: pid,
              fromPeerId: callState.peerId
            });
            if (st !== 'connected' && st !== 'completed' && callState.peerId > pid && pc.signalingState === 'stable') {
              createAndSendOffer(peerObj, { iceRestart: true });
            }
            updateCallControlsUI();
          }
        }, 3500);

        pc.onicecandidate = (ev) => {
          if (ev.candidate && callState.active && callState.roomId) {
            sendCallWs({
              type: 'wetalks_call_signal',
              roomId: callState.roomId,
              targetPeerId: pid,
              fromPeerId: callState.peerId,
              signal: { type: 'candidate', candidate: ev.candidate }
            });
          }
        };

        pc.ontrack = (ev) => {
          try {
            const isAudioTrack = ev.track && ev.track.kind === 'audio';
            if (ev.receiver && 'playoutDelayHint' in ev.receiver) ev.receiver.playoutDelayHint = isAudioTrack ? 0.04 : 0.02;
            if (ev.receiver && 'jitterBufferTarget' in ev.receiver) ev.receiver.jitterBufferTarget = isAudioTrack ? 40 : 20;
          } catch (e) {}

          const incomingTrack = ev.track;
          if (!incomingTrack) return;

          if (incomingTrack.kind === 'audio') {
            peerObj.audioStream.getAudioTracks().forEach(t => {
              if (t.id !== incomingTrack.id) peerObj.audioStream.removeTrack(t);
            });
            if (!peerObj.audioStream.getTracks().some(t => t.id === incomingTrack.id)) {
              peerObj.audioStream.addTrack(incomingTrack);
            }
            if (peerObj.audioEl) {
              peerObj.audioEl.srcObject = peerObj.audioStream;
              tryPlayPeerAudio(peerObj);
            }
          } else {
            if (!peerObj.stream.getTracks().some(t => t.id === incomingTrack.id)) {
              peerObj.stream.addTrack(incomingTrack);
            }
            if (peerObj.videoEl) {
              if (peerObj.videoEl.srcObject !== peerObj.stream) {
                peerObj.videoEl.srcObject = peerObj.stream;
              }
              peerObj.videoEl.muted = true;
              peerObj.videoEl.play().catch(() => {});
            }
          }

          incomingTrack.onunmute = () => {
            if (incomingTrack.kind === 'audio' && peerObj.audioEl) tryPlayPeerAudio(peerObj);
            updatePeerTileVisuals(peerObj);
          };
          incomingTrack.onmute = () => updatePeerTileVisuals(peerObj);
          incomingTrack.onended = () => updatePeerTileVisuals(peerObj);
          updatePeerTileVisuals(peerObj);
        };

        const handleIceStateChange = () => {
          const state = pc.iceConnectionState;
          if (state === 'connected' || state === 'completed') {
            if (peerObj.iceWatchdogTimer) {
              clearTimeout(peerObj.iceWatchdogTimer);
              peerObj.iceWatchdogTimer = null;
            }
            if (peerObj.rtcAudioReceiving) {
              peerObj.useWsAudioFallback = false;
              stopAudioWsFallback(false);
            }
          } else if (state === 'failed' || state === 'disconnected') {
            peerObj.useWsAudioFallback = true;
            startAudioWsFallback();
            if (state === 'failed' && callState.peerId > pid && pc.signalingState === 'stable') {
              createAndSendOffer(peerObj, { iceRestart: true });
            }
          }
          updateCallControlsUI();
        };

        pc.oniceconnectionstatechange = handleIceStateChange;
        pc.onconnectionstatechange = handleIceStateChange;

        updateCallControlsUI();
        return peerObj;
      }

      async function ensureOffererTransceivers(pc) {
        if (!pc) return;
        const transceivers = pc.getTransceivers();
        let audioTrans = transceivers.find(t =>
          (t.sender && t.sender.track && t.sender.track.kind === 'audio') ||
          (t.receiver && t.receiver.track && t.receiver.track.kind === 'audio')
        );
        let videoTrans = transceivers.find(t =>
          (t.sender && t.sender.track && t.sender.track.kind === 'video') ||
          (t.receiver && t.receiver.track && t.receiver.track.kind === 'video')
        );
        const liveAudio = callState.localAudioTrack && callState.localAudioTrack.readyState === 'live' ? callState.localAudioTrack : null;
        const liveVideo = callState.localVideoTrack && callState.localVideoTrack.readyState === 'live' ? callState.localVideoTrack : null;

        if (!audioTrans) {
          if (liveAudio && callState.localStream) {
            pc.addTrack(liveAudio, callState.localStream);
          } else {
            pc.addTransceiver('audio', { direction: 'sendrecv' });
          }
        } else {
          try { audioTrans.direction = 'sendrecv'; } catch (e) {}
          if (liveAudio && audioTrans.sender && audioTrans.sender.track !== liveAudio) {
            try { await audioTrans.sender.replaceTrack(liveAudio); } catch (e) {}
          }
        }

        if (!videoTrans) {
          if (liveVideo && callState.localStream) {
            pc.addTrack(liveVideo, callState.localStream);
          } else {
            pc.addTransceiver('video', { direction: 'sendrecv' });
          }
        } else {
          try { videoTrans.direction = 'sendrecv'; } catch (e) {}
          if (liveVideo && videoTrans.sender && videoTrans.sender.track !== liveVideo) {
            try { await videoTrans.sender.replaceTrack(liveVideo); } catch (e) {}
          }
        }
      }

      async function attachLocalTracksToAnswererTransceivers(pc) {
        if (!pc) return;
        const liveAudio = callState.localAudioTrack && callState.localAudioTrack.readyState === 'live' ? callState.localAudioTrack : null;
        const liveVideo = callState.localVideoTrack && callState.localVideoTrack.readyState === 'live' ? callState.localVideoTrack : null;
        for (const trans of pc.getTransceivers()) {
          const kind = (trans.receiver && trans.receiver.track && trans.receiver.track.kind) ||
            (trans.sender && trans.sender.track && trans.sender.track.kind);
          if (kind === 'audio') {
            try { trans.direction = 'sendrecv'; } catch (e) {}
            if (liveAudio && trans.sender && trans.sender.track !== liveAudio) {
              try { await trans.sender.replaceTrack(liveAudio); } catch (e) {}
            }
          } else if (kind === 'video') {
            try { trans.direction = 'sendrecv'; } catch (e) {}
            if (liveVideo && trans.sender && trans.sender.track !== liveVideo) {
              try { await trans.sender.replaceTrack(liveVideo); } catch (e) {}
            }
          }
        }
      }

      async function createAndSendOffer(peerObj, options = {}) {
        if (!peerObj || !peerObj.pc || !callState.active) return;
        if (peerObj.makingOffer) return;
        peerObj.makingOffer = true;
        try {
          await ensureOffererTransceivers(peerObj.pc);
          const offerOpts = options && options.iceRestart ? { iceRestart: true } : undefined;
          const offer = await peerObj.pc.createOffer(offerOpts);
          const tunedSdp = tuneLowLatencySdp(offer.sdp);
          try {
            await peerObj.pc.setLocalDescription({ type: 'offer', sdp: tunedSdp });
          } catch (sdpErr) {
            await peerObj.pc.setLocalDescription(offer);
          }
          await applyLowLatencySenderParams(peerObj.pc);
          sendCallWs({
            type: 'wetalks_call_signal',
            roomId: callState.roomId,
            targetPeerId: peerObj.peerId,
            fromPeerId: callState.peerId,
            signal: { type: 'offer', sdp: peerObj.pc.localDescription.sdp }
          });
        } catch (e) {
        } finally {
          peerObj.makingOffer = false;
        }
      }

      async function handleIncomingCallSignal(fromPeerId, signal) {
        if (!callState.active || !signal) return;
        let peerObj = callState.peers.get(fromPeerId);
        if (!peerObj) {
          const roster = callState.rostersByRoom.get(callState.roomId) || [];
          const info = roster.find(p => p.peerId === fromPeerId) || { peerId: fromPeerId, username: 'Member', camOn: false, micOn: false };
          peerObj = getOrCreatePeer(info);
        }
        if (!peerObj || !peerObj.pc) return;
        const pc = peerObj.pc;

        try {
          if (signal.type === 'offer') {
            const polite = callState.peerId < fromPeerId;
            if (pc.signalingState !== 'stable') {
              if (!polite) return;
              await pc.setLocalDescription({ type: 'rollback' });
            }
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
            await attachLocalTracksToAnswererTransceivers(pc);
            while (peerObj.pendingCandidates.length > 0) {
              const cand = peerObj.pendingCandidates.shift();
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
            }
            const answer = await pc.createAnswer();
            const tunedAnswerSdp = tuneLowLatencySdp(answer.sdp);
            try {
              await pc.setLocalDescription({ type: 'answer', sdp: tunedAnswerSdp });
            } catch (sdpErr) {
              await pc.setLocalDescription(answer);
            }
            await applyLowLatencySenderParams(pc);
            sendCallWs({
              type: 'wetalks_call_signal',
              roomId: callState.roomId,
              targetPeerId: fromPeerId,
              fromPeerId: callState.peerId,
              signal: { type: 'answer', sdp: pc.localDescription.sdp }
            });
          } else if (signal.type === 'answer') {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
              while (peerObj.pendingCandidates.length > 0) {
                const cand = peerObj.pendingCandidates.shift();
                try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
              }
            }
          } else if (signal.type === 'candidate' && signal.candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } else {
              peerObj.pendingCandidates.push(signal.candidate);
            }
          }
        } catch (e) {}
      }

      async function acquireLocalCallMedia(wantVideo) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return { stream: null, videoTrack: null, audioTrack: null, notice: 'ブラウザがメディア通話に対応していないため、受信専用モードで参加しました。' };
        }
        let stream = null;
        let notice = '';
        if (wantVideo) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: CALL_VIDEO_CONSTRAINTS,
              audio: CALL_AUDIO_CONSTRAINTS
            });
          } catch (err) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } },
                audio: true
              });
            } catch (err2) {
              try {
                stream = await navigator.mediaDevices.getUserMedia({
                  video: false,
                  audio: CALL_AUDIO_CONSTRAINTS
                });
                notice = 'カメラを使用できないため、音声のみで参加しました。';
              } catch (err3) {
                try {
                  stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                  notice = 'カメラを使用できないため、音声のみで参加しました。';
                } catch (err4) {
                  notice = 'カメラ・マイクへのアクセスが許可されていないため、受信専用モードで参加しました。';
                }
              }
            }
          }
        } else {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: CALL_AUDIO_CONSTRAINTS
            });
          } catch (err) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            } catch (err2) {
              notice = 'マイクを使用できないため、受信専用モードで参加しました。';
            }
          }
        }

        let videoTrack = stream ? (stream.getVideoTracks()[0] || null) : null;
        let audioTrack = stream ? (stream.getAudioTracks()[0] || null) : null;
        if (videoTrack) {
          try { videoTrack.contentHint = 'motion'; } catch (e) {}
        }
        if (audioTrack) {
          try { audioTrack.contentHint = 'speech'; } catch (e) {}
        }
        return { stream, videoTrack, audioTrack, notice };
      }

      async function joinVideoCall(withCamera = true) {
        if (currentView !== 'chat' || !activeRoomId || callState.joining) return;
        const uname = getSessionUser();
        if (!uname || uname === 'ゲスト') return;

        if (callState.active && callState.roomId === activeRoomId) {
          if (withCamera && !callState.camOn) await toggleCallCamera();
          return;
        }
        if (callState.active) {
          leaveVideoCall(true);
        }

        callState.joining = true;
        callState.roomId = activeRoomId;
        callState.username = uname;
        callState.collapsed = false;
        callState.expanded = false;
        callState.deafened = false;

        ensureCallAudioCtx();

        try {
          const media = await acquireLocalCallMedia(Boolean(withCamera));
          if (currentView !== 'chat' || activeRoomId !== callState.roomId) {
            if (media.stream) media.stream.getTracks().forEach(t => t.stop());
            return;
          }

          callState.localStream = media.stream || new MediaStream();
          callState.localVideoTrack = media.videoTrack;
          callState.localAudioTrack = media.audioTrack;
          if (callState.localAudioTrack) {
            callState.localAudioTrack.enabled = false;
          }
          callState.camOn = Boolean(media.videoTrack);
          callState.micOn = false;
          callState.active = true;

          setCallNotice(media.notice || '');
          ensureLocalCallTile();
          if (callState.localAudioTrack) {
            attachAnalyserForPeer(callState.peerId, new MediaStream([callState.localAudioTrack]));
          }
          updateCallControlsUI();
          updateRoomCallBanner();

          connectInternalWetalksWs();
          sendCallWs({
            type: 'wetalks_call_join',
            roomId: callState.roomId,
            peerId: callState.peerId,
            username: callState.username,
            camOn: callState.camOn,
            micOn: callState.micOn
          });
        } finally {
          callState.joining = false;
        }
      }

      function leaveVideoCall(silent = false) {
        const prevRoomId = callState.roomId;
        const wasActive = callState.active;

        callState.active = false;
        callState.joining = false;
        callState.roomId = null;
        callState.focusedPeerId = null;

        if (wasActive && prevRoomId) {
          sendCallWs({ type: 'wetalks_call_leave', roomId: prevRoomId, peerId: callState.peerId });
        }

        if (callState.statsTimer) {
          clearInterval(callState.statsTimer);
          callState.statsTimer = null;
        }
        stopAudioWsFallback(true);
        stopWsAudioPlaybackNode();
        callState.wsAudioPlayBuffers.clear();
        callState.audioPlayBlocked = false;

        Array.from(callState.peers.keys()).forEach(pid => removePeerConnection(pid));

        if (callState.vadTimer) {
          clearInterval(callState.vadTimer);
          callState.vadTimer = null;
        }
        callState.analysers.forEach(ana => {
          try { if (ana && ana.source) ana.source.disconnect(); } catch (e) {}
        });
        callState.analysers.clear();
        if (callState.audioCtx) {
          try { callState.audioCtx.close(); } catch (e) {}
          callState.audioCtx = null;
        }
        callState.vadBuf = null;

        if (callState.localVideoTrack) {
          try { callState.localVideoTrack.stop(); } catch (e) {}
          callState.localVideoTrack = null;
        }
        if (callState.localAudioTrack) {
          try { callState.localAudioTrack.stop(); } catch (e) {}
          callState.localAudioTrack = null;
        }
        if (callState.localStream) {
          try { callState.localStream.getTracks().forEach(t => t.stop()); } catch (e) {}
          callState.localStream = null;
        }

        if (DOM.callVideoGrid) {
          Array.from(DOM.callVideoGrid.querySelectorAll('video')).forEach(v => { try { v.srcObject = null; } catch (e) {} });
          DOM.callVideoGrid.innerHTML = '';
        }
        const sink = document.getElementById('call-audio-sink');
        if (sink) sink.innerHTML = '';
        setCallNotice('');
        updateCallControlsUI();
        if (!silent) updateRoomCallBanner();
      }

      async function toggleCallCamera() {
        if (!callState.active) return;
        if (callState.camOn) {
          callState.camOn = false;
          if (callState.localVideoTrack) {
            try { callState.localVideoTrack.stop(); } catch (e) {}
            if (callState.localStream) {
              try { callState.localStream.removeTrack(callState.localVideoTrack); } catch (e) {}
            }
            callState.localVideoTrack = null;
          }
          for (const peerObj of callState.peers.values()) {
            try {
              const trans = peerObj.pc.getTransceivers().find(t => t.receiver && t.receiver.track && t.receiver.track.kind === 'video');
              if (trans && trans.sender) await trans.sender.replaceTrack(null);
            } catch (e) {}
          }
        } else {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCallNotice('ブラウザがカメラ入力に対応していません。');
            return;
          }
          try {
            const camStream = await navigator.mediaDevices.getUserMedia({ video: CALL_VIDEO_CONSTRAINTS, audio: false });
            const track = camStream.getVideoTracks()[0];
            if (!track) return;
            try { track.contentHint = 'motion'; } catch (e) {}
            callState.localVideoTrack = track;
            if (!callState.localStream) callState.localStream = new MediaStream();
            callState.localStream.addTrack(track);
            callState.camOn = true;
            setCallNotice('');

            for (const peerObj of callState.peers.values()) {
              try {
                const trans = peerObj.pc.getTransceivers().find(t => t.receiver && t.receiver.track && t.receiver.track.kind === 'video');
                if (trans && trans.sender) {
                  await trans.sender.replaceTrack(track);
                  await applyLowLatencySenderParams(peerObj.pc);
                }
              } catch (e) {}
            }
          } catch (err) {
            setCallNotice('カメラを起動できませんでした（権限またはデバイスを確認してください）。');
            return;
          }
        }

        ensureLocalCallTile();
        updateCallControlsUI();
        sendCallWs({
          type: 'wetalks_call_media_state',
          roomId: callState.roomId,
          peerId: callState.peerId,
          camOn: callState.camOn,
          micOn: callState.micOn
        });
      }

      async function toggleCallMic() {
        if (!callState.active) return;
        unlockBlockedCallAudio();
        if (!callState.localAudioTrack || callState.localAudioTrack.readyState === 'ended') {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCallNotice('マイクを使用できません。');
            return;
          }
          try {
            let aStream = null;
            try {
              aStream = await navigator.mediaDevices.getUserMedia({ audio: CALL_AUDIO_CONSTRAINTS, video: false });
            } catch (e1) {
              aStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            }
            const track = aStream.getAudioTracks()[0];
            if (!track) return;
            try { track.contentHint = 'speech'; } catch (e) {}
            callState.localAudioTrack = track;
            if (!callState.localStream) callState.localStream = new MediaStream();
            callState.localStream.getAudioTracks().forEach(t => { try { callState.localStream.removeTrack(t); } catch (e) {} });
            callState.localStream.addTrack(track);
            callState.micOn = true;
            setCallNotice('');
            attachAnalyserForPeer(callState.peerId, new MediaStream([track]));
            for (const peerObj of callState.peers.values()) {
              try {
                const trans = peerObj.pc.getTransceivers().find(t =>
                  (t.sender && t.sender.track && t.sender.track.kind === 'audio') ||
                  (t.receiver && t.receiver.track && t.receiver.track.kind === 'audio')
                );
                if (trans && trans.sender) {
                  if (trans.direction === 'recvonly' || trans.direction === 'inactive') {
                    try { trans.direction = 'sendrecv'; } catch (e) {}
                  }
                  await trans.sender.replaceTrack(track);
                  await applyLowLatencySenderParams(peerObj.pc);
                  if (trans.currentDirection !== 'sendrecv' && trans.currentDirection !== 'sendonly' && peerObj.pc.signalingState === 'stable') {
                    createAndSendOffer(peerObj);
                  }
                } else {
                  peerObj.pc.addTrack(track, callState.localStream);
                  if (peerObj.pc.signalingState === 'stable') createAndSendOffer(peerObj);
                }
              } catch (e) {}
            }
            if (needsWsAudioFallback()) startAudioWsFallback();
          } catch (e) {
            setCallNotice('マイクへのアクセスが許可されていません。');
            return;
          }
        } else {
          callState.micOn = !callState.micOn;
          callState.localAudioTrack.enabled = callState.micOn;
          if (callState.micOn && needsWsAudioFallback()) {
            startAudioWsFallback();
          }
        }
        ensureLocalCallTile();
        updateCallControlsUI();
        sendCallWs({
          type: 'wetalks_call_media_state',
          roomId: callState.roomId,
          peerId: callState.peerId,
          camOn: callState.camOn,
          micOn: callState.micOn
        });
      }

      function toggleCallDeafen() {
        if (!callState.active) return;
        callState.deafened = !callState.deafened;
        callState.peers.forEach(peerObj => {
          if (peerObj.audioEl) {
            peerObj.audioEl.muted = callState.deafened;
            if (!callState.deafened && peerObj.audioStream && peerObj.audioStream.getAudioTracks().length > 0) {
              tryPlayPeerAudio(peerObj);
            }
          }
        });
        if (callState.wsAudioPlayOutGain) {
          try { callState.wsAudioPlayOutGain.gain.value = callState.deafened ? 0 : 1.15; } catch (e) {}
        }
        if (callState.deafened) {
          callState.wsAudioPlayBuffers.forEach((pb) => {
            pb.readIdx = 0;
            pb.writeIdx = 0;
            pb.count = 0;
            pb.started = false;
            pb.lastOutSample = 0;
          });
        }
        if (!callState.deafened) unlockBlockedCallAudio();
        updateCallControlsUI();
      }

      function handleCallWsMessage(data) {
        if (!data || !data.type) return;
        if (data.type === 'wetalks_call_roster') {
          if (data.roomId) {
            callState.rostersByRoom.set(data.roomId, Array.isArray(data.participants) ? data.participants : []);
            if (currentView === 'chat' && activeRoomId === data.roomId) {
              updateRoomCallBanner();
            }
          }
          return;
        }

        if (data.type === 'wetalks_call_joined') {
          if (!callState.active || data.roomId !== callState.roomId) return;
          const list = Array.isArray(data.participants) ? data.participants : [];
          callState.rostersByRoom.set(data.roomId, list);
          list.forEach(p => {
            if (!p || !p.peerId || p.peerId === callState.peerId) return;
            const peerObj = getOrCreatePeer(p);
            if (peerObj && callState.peerId > p.peerId && !peerObj.pc.remoteDescription && peerObj.pc.signalingState === 'stable') {
              createAndSendOffer(peerObj);
            }
          });
          updateCallControlsUI();
          return;
        }

        if (data.type === 'wetalks_call_peer_joined') {
          if (!callState.active || data.roomId !== callState.roomId || !data.peer) return;
          const p = data.peer;
          if (p.peerId === callState.peerId) return;
          const peerObj = getOrCreatePeer(p);
          if (peerObj && callState.peerId > p.peerId && !peerObj.pc.remoteDescription && peerObj.pc.signalingState === 'stable') {
            createAndSendOffer(peerObj);
          }
          updateCallControlsUI();
          return;
        }

        if (data.type === 'wetalks_call_peer_left') {
          if (data.peerId && callState.peers.has(data.peerId)) {
            removePeerConnection(data.peerId);
          }
          return;
        }

        if (data.type === 'wetalks_call_media_state') {
          if (!callState.active || data.roomId !== callState.roomId) return;
          const peerObj = callState.peers.get(data.peerId);
          if (peerObj) {
            peerObj.camOn = Boolean(data.camOn);
            peerObj.micOn = data.micOn !== false;
            updatePeerTileVisuals(peerObj);
          }
          return;
        }

        if (data.type === 'wetalks_call_need_ws_audio') {
          if (!callState.active || data.roomId !== callState.roomId) return;
          const peerObj = callState.peers.get(data.fromPeerId);
          if (peerObj) {
            peerObj.peerRequestedWsAudio = true;
            peerObj.useWsAudioFallback = true;
            startAudioWsFallback();
            updateCallControlsUI();
          }
          return;
        }

        if (data.type === 'wetalks_call_audio') {
          if (!callState.active || data.roomId !== callState.roomId) return;
          if (data.fromPeerId && data.fromPeerId !== callState.peerId && data.pcm) {
            handleIncomingCallAudioPcm(data.fromPeerId, data.sampleRate, data.pcm);
          }
          return;
        }

        if (data.type === 'wetalks_call_signal') {
          if (!callState.active || data.roomId !== callState.roomId) return;
          if (data.fromPeerId && data.signal) {
            handleIncomingCallSignal(data.fromPeerId, data.signal);
          }
        }
      }

      if (callBc) {
        callBc.onmessage = (ev) => {
          const msg = ev && ev.data;
          if (!msg || msg.fromPeerId === callState.peerId) return;
          if (msg.type === 'wetalks_call_join' && callState.active && msg.roomId === callState.roomId) {
            const pObj = getOrCreatePeer({ peerId: msg.peerId, username: msg.username, camOn: msg.camOn, micOn: msg.micOn });
            callBc.postMessage({
              type: 'wetalks_call_bc_roster',
              roomId: callState.roomId,
              fromPeerId: callState.peerId,
              peer: { peerId: callState.peerId, username: callState.username, camOn: callState.camOn, micOn: callState.micOn }
            });
            if (pObj && callState.peerId > msg.peerId) createAndSendOffer(pObj);
          } else if (msg.type === 'wetalks_call_bc_roster' && msg.roomId === activeRoomId && msg.peer) {
            const cur = (callState.rostersByRoom.get(msg.roomId) || []).filter(x => x.peerId !== msg.peer.peerId);
            cur.push(msg.peer);
            callState.rostersByRoom.set(msg.roomId, cur);
            updateRoomCallBanner();
            if (callState.active && msg.roomId === callState.roomId) {
              const pObj = getOrCreatePeer(msg.peer);
              if (pObj && callState.peerId > msg.peer.peerId && pObj.pc.signalingState === 'stable' && !pObj.pc.remoteDescription) {
                createAndSendOffer(pObj);
              }
            }
          } else if (msg.type === 'wetalks_call_leave' && msg.roomId === callState.roomId) {
            removePeerConnection(msg.peerId);
          } else if (msg.type === 'wetalks_call_media_state') {
            handleCallWsMessage(msg);
          } else if (msg.type === 'wetalks_call_audio') {
            handleCallWsMessage(msg);
          } else if (msg.type === 'wetalks_call_signal' && msg.targetPeerId === callState.peerId) {
            handleCallWsMessage(msg);
          }
        };
      }

      if (DOM.callNotice) {
        DOM.callNotice.addEventListener('click', unlockBlockedCallAudio);
      }
      document.addEventListener('pointerdown', () => {
        if (callState.active && callState.audioPlayBlocked) unlockBlockedCallAudio();
      }, true);

      if (DOM.btnVideoCall) {
        DOM.btnVideoCall.addEventListener('click', () => {
          if (callState.active) {
            callState.collapsed = !callState.collapsed;
            updateCallControlsUI();
          } else {
            joinVideoCall(true);
          }
        });
      }
      if (DOM.btnBannerJoinVideo) DOM.btnBannerJoinVideo.addEventListener('click', () => joinVideoCall(true));
      if (DOM.btnBannerJoinVoice) DOM.btnBannerJoinVoice.addEventListener('click', () => joinVideoCall(false));
      if (DOM.btnCallCam) DOM.btnCallCam.addEventListener('click', toggleCallCamera);
      if (DOM.btnCallMic) DOM.btnCallMic.addEventListener('click', toggleCallMic);
      if (DOM.btnCallDeafen) DOM.btnCallDeafen.addEventListener('click', toggleCallDeafen);
      if (DOM.btnCallLeave) DOM.btnCallLeave.addEventListener('click', () => leaveVideoCall(false));
      if (DOM.btnCallCollapse) {
        DOM.btnCallCollapse.addEventListener('click', () => {
          callState.collapsed = !callState.collapsed;
          updateCallControlsUI();
        });
      }
      if (DOM.btnCallExpand) {
        DOM.btnCallExpand.addEventListener('click', () => {
          callState.expanded = !callState.expanded;
          if (callState.expanded) callState.collapsed = false;
          updateCallControlsUI();
        });
      }

      if (wetalksBroadcast) {
        wetalksBroadcast.onmessage = (ev) => {
          const evt = ev && ev.data;
          if (!evt || evt.user === getSessionUser()) return;
          if (evt.roomId && currentView === 'chat' && activeRoomId === evt.roomId) {
            pollActiveRoomMessages();
          } else if (currentView === 'lobby') {
            pollBackgroundOtherRooms(true);
          }
        };
      }

      window.addEventListener('message', e => {
        if (e.data && e.data.type === 'WETALKS_OPEN_ROOM' && e.data.roomId) {
          const uname = getSessionUser();
          if (uname && uname !== 'ゲスト') {
            try { localStorage.removeItem(PENDING_OPEN_ROOM_KEY); } catch (err) {}
            activeRoomId = String(e.data.roomId);
            switchView('chat');
          } else {
            try { localStorage.setItem(PENDING_OPEN_ROOM_KEY, String(e.data.roomId)); } catch (err) {}
          }
        } else if (e.data && e.data.type === 'WETALKS_WINDOW_ACTIVE') {
          const nextActive = Boolean(e.data.active);
          const becameActive = !parentWindowActive && nextActive;
          parentWindowActive = nextActive;
          if (nextActive && currentView === 'chat' && activeRoomId) {
            markActiveRoomAsRead(activeRoomId, becameActive).then(() => pollActiveRoomMessages()).catch(() => {});
          }
        }
      });

      const clearActiveViewingRoom = () => {
        try { localStorage.setItem(ACTIVE_VIEWING_ROOM_KEY, ''); } catch (e) {}
      };
      window.addEventListener('beforeunload', () => {
        leaveVideoCall(true);
        clearActiveViewingRoom();
      });
      window.addEventListener('pagehide', clearActiveViewingRoom);

      const handleRoomReadOnFocus = () => {
        if (isViewActiveForRead()) {
          markActiveRoomAsRead(activeRoomId, true).then(() => pollActiveRoomMessages()).catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', handleRoomReadOnFocus);
      window.addEventListener('focus', handleRoomReadOnFocus);
      window.addEventListener('online', () => {
        if (currentView === 'chat' && activeRoomId) {
          retryPendingMessagesForRoom(activeRoomId, true).then(() => pollActiveRoomMessages()).catch(() => {});
        }
      });

      function initGlobalDeleteListener() {
        if (!supabaseClient) return;
        const lobbyChannel = supabaseClient.channel('global-lobby-sync');
        lobbyChannel
          .on('broadcast', { event: 'room_deleted' }, ({ payload }) => {
            const delId = payload.roomId;
            if (activeRoomId === delId) {
              switchView('lobby');
            } else {
              renderLobby();
            }
          })
          .subscribe();
      }

      // Lightweight WS connection for both WeTalks instant notifications and ultra-low-latency WebRTC call signaling
      function connectInternalWetalksWs() {
        if (window.location && window.location.hostname && window.location.hostname.endsWith('github.io')) return;
        if (internalWs && (internalWs.readyState === WebSocket.OPEN || internalWs.readyState === WebSocket.CONNECTING)) return;
        try {
          const origin = resolveInternalOrigin();
          if (!origin || !origin.startsWith('http')) return;
          const wsUrl = origin.replace(/^http/i, 'ws') + '/ws';
          internalWs = new WebSocket(wsUrl);
          internalWs.onopen = () => {
            try {
              internalWs.send(JSON.stringify({ type: 'wetalks_subscribe', username: getSessionUser() }));
              if (callState.active && callState.roomId) {
                internalWs.send(JSON.stringify({
                  type: 'wetalks_call_join',
                  roomId: callState.roomId,
                  peerId: callState.peerId,
                  username: callState.username || getSessionUser(),
                  camOn: callState.camOn,
                  micOn: callState.micOn
                }));
              } else if (currentView === 'chat' && activeRoomId) {
                internalWs.send(JSON.stringify({ type: 'wetalks_call_probe', roomId: String(activeRoomId) }));
              }
            } catch(e) {}
          };
          internalWs.onmessage = (ev) => {
            try {
              const data = JSON.parse(ev.data);
              if (!data) return;
              if (data.type && data.type.startsWith('wetalks_call_')) {
                handleCallWsMessage(data);
                return;
              }
              if (data.type === 'wetalks_event') {
                if (currentView === 'chat' && activeRoomId && data.roomId === activeRoomId) {
                  pollActiveRoomMessages();
                } else {
                  if (data.event === 'message' && data.message && data.message.id && data.message.sender) {
                    const me = getSessionUser();
                    const canReceive = !Array.isArray(data.members) || data.members.includes(me);
                    if (canReceive && data.message.sender !== me) {
                      checkAndNotifyNewMessage({
                        ...data.message,
                        room_id: data.roomId || data.message.room_id,
                        text: data.message.text || (data.message.has_image ? '📷 画像を送信しました' : '')
                      }, resolveRoomDisplayName(data.roomId, data.roomName || ''));
                    }
                  }
                  pollBackgroundOtherRooms(true);
                }
              }
            } catch(e) {}
          };
          internalWs.onclose = () => {
            internalWs = null;
            setTimeout(connectInternalWetalksWs, 2500);
          };
          internalWs.onerror = () => {
            try { internalWs.close(); } catch(e) {}
          };
        } catch(e) {}
      }

      // Fast adaptive polling: 1.5s while actively inside a chat room, 3s background/lobby sync
      let pollTickCount = 0;
      setInterval(async () => {
        pollTickCount++;
        try {
          if (currentView === 'chat' && activeRoomId) {
            await pollActiveRoomMessages();
            if (pollTickCount % 2 === 0) {
              await pollBackgroundOtherRooms();
            }
          } else if (pollTickCount % 2 === 0) {
            if (currentView === 'lobby') {
              await pollLobbyUpdates();
            } else if (currentView === 'settings') {
              await pollBackgroundOtherRooms();
            }
          }
        } catch(e) {}
      }, 1500);

      initSupabase();
      initGlobalDeleteListener();
      fetchUserIpAndInitName().then(() => {
        if (currentView === 'lobby') {
          setTimeout(() => pollBackgroundOtherRooms(true), 400);
        }
        connectInternalWetalksWs();
      });
    })();
  </script>
</body>
</html>`;

// 3DヨットダイスのHTMLソース
export const YACHT_GAME_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>We talks Yacht Dice</title>
  <style>
    :root {
      --primary: #06C755;
      --bg: #1e293b;
      --panel: #334155;
      --text: #f8fafc;
      --text-dim: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; margin: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg); color: var(--text); padding: 12px; display: flex; flex-direction: column; overflow: hidden;
    }
    .header { background: var(--primary); padding: 12px; font-weight: bold; border-radius: 8px; text-align: center; margin-bottom: 12px; flex-shrink: 0; font-size:16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .lobby-screen, .game-screen { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .btn { background: var(--primary); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: center; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); transition: background-color 0.15s; }
    .btn:hover { background: #05b042; }
    .btn.secondary { background: #64748b; }
    .btn.secondary:hover { background: #475569; }
    .btn:disabled { background: #475569; opacity: 0.5; cursor: default; }
    .game-board { display: flex; flex-direction: row; gap: 12px; flex: 1; overflow: hidden; }
    .board-left { flex: 1.2; display: flex; flex-direction: column; gap: 12px; }
    .board-right { flex: 0.8; background: var(--panel); border-radius: 8px; padding: 10px; overflow-y: auto; font-size: 12px; }
    .dice-container { display: flex; gap: 12px; justify-content: center; padding: 15px 0; flex-wrap: wrap; }
    .die-scene { width: 50px; height: 50px; perspective: 300px; cursor: pointer; }
    .die-cube { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.3, 1); }
    .die-face {
      position: absolute; width: 50px; height: 50px; background: #ffffff; border: 2px solid #cbd5e1; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: bold; color: #1e293b;
      box-shadow: inset 0 0 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1); backface-visibility: hidden;
    }
    .die-face.f1 { transform: rotateY(0deg) translateZ(25px); }
    .die-face.f6 { transform: rotateY(180deg) translateZ(25px); }
    .die-face.f3 { transform: rotateY(90deg) translateZ(25px); }
    .die-face.f4 { transform: rotateY(-90deg) translateZ(25px); }
    .die-face.f2 { transform: rotateX(90deg) translateZ(25px); }
    .die-face.f5 { transform: rotateX(-90deg) translateZ(25px); }
    .die-scene.kept .die-face { border: 3px solid #f97316; background: #fff7ed; box-shadow: inset 0 0 6px rgba(249, 115, 22, 0.2), 0 3px 6px rgba(249, 115, 22, 0.3); }
    .score-table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 4px; }
    .score-table th, .score-table td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .score-table th { background: rgba(0,0,0,0.2); color: var(--text-dim); font-size: 11px; }
    .score-row { cursor: pointer; transition: background-color 0.1s; }
    .score-row:hover:not(.scored) { background: rgba(255,255,255,0.05); }
    .score-row.scored { cursor: not-allowed; opacity: 0.6; }
    .score-val { text-align: right; font-weight: bold; color: var(--primary); }
    .score-val.potential { color: #f59e0b; opacity: 0.8; }
    .game-status-bar { padding: 8px; background: rgba(0,0,0,0.15); border-radius: 6px; font-size: 13px; text-align: center; font-weight: bold; }
    .notice-banner { display: none; margin-bottom: 10px; padding: 8px 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.18); border: 1px solid rgba(239, 68, 68, 0.4); color: #fecaca; font-size: 12px; font-weight: bold; text-align: center; }
    .notice-banner.active { display: block; }
  </style>
</head>
<body>
  <div class="header" id="header-text">We talks Yacht Dice</div>

  <div class="lobby-screen" id="lobby-screen">
    <div id="lobby-notice" class="notice-banner"></div>
    <div style="font-size: 13px; color: var(--text-dim); margin-bottom: 12px; text-align: center;">部屋コードを指定してオンライン対戦相手と繋がります</div>
    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <input type="text" id="input-room-code" placeholder="部屋コードを入力 (例: 777)" style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #475569; background: var(--panel); color: white; outline: none; font-size: 14px;" />
      <button class="btn" id="btn-join-room">部屋に入る / 作成</button>
    </div>
    <button class="btn secondary" id="btn-solo-play" style="width: 100%;">練習用ソロプレイ (オフライン)</button>
  </div>

  <div class="game-screen" id="game-screen" style="display: none;">
    <div class="game-board">
      <div class="board-left">
        <div class="game-status-bar" id="status-bar">対戦相手を待っています...</div>
        <div class="dice-container" id="dice-container">
          <div class="die-scene" data-idx="0"><div class="die-cube"><div class="die-face f1">⚀</div><div class="die-face f2">⚁</div><div class="die-face f3">⚂</div><div class="die-face f4">⚃</div><div class="die-face f5">⚄</div><div class="die-face f6">⚅</div></div></div>
          <div class="die-scene" data-idx="1"><div class="die-cube"><div class="die-face f1">⚀</div><div class="die-face f2">⚁</div><div class="die-face f3">⚂</div><div class="die-face f4">⚃</div><div class="die-face f5">⚄</div><div class="die-face f6">⚅</div></div></div>
          <div class="die-scene" data-idx="2"><div class="die-cube"><div class="die-face f1">⚀</div><div class="die-face f2">⚁</div><div class="die-face f3">⚂</div><div class="die-face f4">⚃</div><div class="die-face f5">⚄</div><div class="die-face f6">⚅</div></div></div>
          <div class="die-scene" data-idx="3"><div class="die-cube"><div class="die-face f1">⚀</div><div class="die-face f2">⚁</div><div class="die-face f3">⚂</div><div class="die-face f4">⚃</div><div class="die-face f5">⚄</div><div class="die-face f6">⚅</div></div></div>
          <div class="die-scene" data-idx="4"><div class="die-cube"><div class="die-face f1">⚀</div><div class="die-face f2">⚁</div><div class="die-face f3">⚂</div><div class="die-face f4">⚃</div><div class="die-face f5">⚄</div><div class="die-face f6">⚅</div></div></div>
        </div>
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button class="btn" id="btn-roll" style="flex: 1;">サイコロを振る (残り3回)</button>
          <button class="btn secondary" id="btn-leave-game" style="flex: 0.5;">退出</button>
        </div>
        <div style="font-size: 10px; color: var(--text-dim); text-align: center;">※キープしたいサイコロをタップして「サイコロを振る」を押してください。</div>
      </div>
      <div class="board-right">
        <h4 style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 6px; font-size: 13px;">スコアシート</h4>
        <table class="score-table">
          <thead><tr><th>役名</th><th style="text-align: right;">あなた</th><th style="text-align: right;" id="col-opp">相手</th></tr></thead>
          <tbody id="score-rows-container"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    (function() {
      'use strict';

      let localStorage;
      try {
        window.localStorage.getItem('test');
        localStorage = window.localStorage;
      } catch (e) {
        localStorage = {
          _data: {},
          getItem: function(k) { return this._data[k] !== undefined ? this._data[k] : null; },
          setItem: function(k, v) { this._data[k] = String(v); },
          removeItem: function(k) { delete this._data[k]; },
          clear: function() { this._data = {}; }
        };
      }

      let sessionStorage;
      try {
        window.sessionStorage.getItem('test');
        sessionStorage = window.sessionStorage;
      } catch (e) {
        sessionStorage = {
          _data: {},
          getItem: function(k) { return this._data[k] !== undefined ? this._data[k] : null; },
          setItem: function(k, v) { this._data[k] = String(v); },
          removeItem: function(k) { delete this._data[k]; },
          clear: function() { this._data = {}; }
        };
      }

      function resolveGameWsUrl() {
        let origin = '';
        try {
          if (window.parent && window.parent.location && window.parent.location.origin && window.parent.location.origin !== 'null') {
            origin = window.parent.location.origin;
          }
        } catch (e) {}
        if (!origin) {
          try {
            const saved = localStorage.getItem('webos_app_origin');
            if (saved && saved !== 'null') origin = saved;
          } catch (e) {}
        }
        if (!origin && document.referrer && document.referrer.startsWith('http')) {
          try { origin = new URL(document.referrer).origin; } catch (e) {}
        }
        if (!origin && window.location && window.location.origin && window.location.origin !== 'null') {
          origin = window.location.origin;
        }
        if (!origin) return null;
        return origin.replace(/^http/i, 'ws') + '/ws';
      }

      function createGameWsChannel(channelName, meta) {
        const wsUrl = resolveGameWsUrl();
        const handlers = new Map();
        let ws = null;
        let joined = false;
        let closed = false;
        const queue = [];
        let pingTimer = null;

        function emit(ev, payload) {
          const list = handlers.get(ev);
          if (list) list.forEach(fn => { try { fn({ payload }); } catch (e) {} });
        }

        function sendRaw(obj) {
          if (closed) return;
          if (ws && ws.readyState === 1 && joined) {
            try { ws.send(JSON.stringify(obj)); } catch (e) {}
          } else {
            queue.push(obj);
          }
        }

        const api = {
          on(typeOrEvent, filterOrFn, maybeFn) {
            const ev = (typeof filterOrFn === 'object' && filterOrFn && filterOrFn.event) ? filterOrFn.event : typeOrEvent;
            const fn = typeof maybeFn === 'function' ? maybeFn : (typeof filterOrFn === 'function' ? filterOrFn : null);
            if (ev && fn) {
              if (!handlers.has(ev)) handlers.set(ev, []);
              handlers.get(ev).push(fn);
            }
            return api;
          },
          send(msg) {
            sendRaw({
              type: 'relay_broadcast',
              channel: channelName,
              event: msg.event,
              payload: msg.payload || {}
            });
          },
          subscribe(cb) {
            if (!wsUrl) {
              if (cb) cb('CHANNEL_ERROR');
              return api;
            }
            try {
              ws = new WebSocket(wsUrl);
              ws.onopen = () => {
                if (closed) return;
                ws.send(JSON.stringify({
                  type: 'relay_join',
                  channel: channelName,
                  memberId: meta.memberId,
                  username: meta.username
                }));
                pingTimer = setInterval(() => {
                  if (ws && ws.readyState === 1) {
                    try { ws.send(JSON.stringify({ type: 'ping' })); } catch (e) {}
                  }
                }, 20000);
              };
              ws.onmessage = (e) => {
                try {
                  const data = JSON.parse(e.data);
                  if (data.type === 'relay_joined' && data.channel === channelName) {
                    joined = true;
                    while (queue.length > 0 && ws && ws.readyState === 1) {
                      ws.send(JSON.stringify(queue.shift()));
                    }
                    if (cb) cb('SUBSCRIBED');
                  } else if (data.type === 'relay_event' && data.channel === channelName) {
                    emit(data.event, data.payload || {});
                  } else if (data.type === 'relay_member_joined' && data.channel === channelName) {
                    emit('relay_member_joined', { memberId: data.memberId, username: data.username });
                  } else if (data.type === 'relay_member_left' && data.channel === channelName) {
                    emit('relay_member_left', { memberId: data.memberId, username: data.username });
                  }
                } catch (err) {}
              };
              ws.onerror = () => { if (cb) cb('CHANNEL_ERROR'); };
              ws.onclose = () => {
                joined = false;
                if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
              };
            } catch (e) {
              if (cb) cb('CHANNEL_ERROR');
            }
            return api;
          },
          close() {
            closed = true;
            if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
            if (ws) {
              if (ws.readyState === 1) {
                try { ws.send(JSON.stringify({ type: 'relay_leave', channel: channelName })); } catch (e) {}
              }
              try { ws.close(); } catch (e) {}
              ws = null;
            }
          }
        };
        return api;
      }

      let gameChannel = null;
      let isSolo = false;
      let myId = 'p-' + Math.floor(1000 + Math.random() * 9000);
      let myName = (function() {
        try {
          return sessionStorage.getItem('wetalks_session_user') || localStorage.getItem('wetalks_logged_in_user') || 'ゲスト';
        } catch (e) { return 'ゲスト'; }
      })();
      let oppId = null;
      let oppName = "対戦相手";
      let diceValues = [1, 1, 1, 1, 1];
      let diceKept = [false, false, false, false, false];
      let rollCount = 0;
      let isMyTurn = false;
      let gameActive = false;
      let rollRotations = [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}];

      const CATEGORIES = [
        { id: 'aces', name: '① エース', calc: d => sumOf(d, 1) },
        { id: 'deuces', name: '② デュース', calc: d => sumOf(d, 2) },
        { id: 'treys', name: '③ トレイ', calc: d => sumOf(d, 3) },
        { id: 'fours', name: '④ フォー', calc: d => sumOf(d, 4) },
        { id: 'fives', name: '⑤ ファイブ', calc: d => sumOf(d, 5) },
        { id: 'sixes', name: '⑥ シックス', calc: d => sumOf(d, 6) },
        { id: 'choice', name: '選択 (全合計)', calc: d => d.reduce((a, b) => a + b, 0) },
        { id: 'four_kind', name: 'フォー・カインド', calc: d => hasOfKind(d, 4) ? d.reduce((a, b) => a + b, 0) : 0 },
        { id: 'full_house', name: 'フルハウス', calc: d => isFullHouse(d) ? d.reduce((a, b) => a + b, 0) : 0 },
        { id: 's_straight', name: 'S.ストレート', calc: d => isSmallStraight(d) ? 15 : 0 },
        { id: 'l_straight', name: 'L.ストレート', calc: d => isLargeStraight(d) ? 30 : 0 },
        { id: 'yacht', name: 'ヨット', calc: d => hasOfKind(d, 5) ? 50 : 0 }
      ];

      let myScores = {};
      let oppScores = {};

      const DOM = {
        lobby: document.getElementById('lobby-screen'),
        lobbyNotice: document.getElementById('lobby-notice'),
        game: document.getElementById('game-screen'),
        roomCode: document.getElementById('input-room-code'),
        btnJoin: document.getElementById('btn-join-room'),
        btnSolo: document.getElementById('btn-solo-play'),
        statusBar: document.getElementById('status-bar'),
        btnRoll: document.getElementById('btn-roll'),
        btnLeave: document.getElementById('btn-leave-game'),
        diceContainer: document.getElementById('dice-container'),
        colOpp: document.getElementById('col-opp'),
        scoreRows: document.getElementById('score-rows-container'),
        headerText: document.getElementById('header-text')
      };

      function showLobbyNotice(msg) {
        if (!DOM.lobbyNotice) return;
        if (!msg) {
          DOM.lobbyNotice.textContent = '';
          DOM.lobbyNotice.classList.remove('active');
        } else {
          DOM.lobbyNotice.textContent = msg;
          DOM.lobbyNotice.classList.add('active');
        }
      }

      function sumOf(d, val) { return d.filter(x => x === val).length * val; }
      function hasOfKind(d, num) {
        const counts = d.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
        return Object.values(counts).some(c => c >= num);
      }
      function isFullHouse(d) {
        const counts = d.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
        const vals = Object.values(counts);
        return (vals.includes(3) && vals.includes(2)) || vals.includes(5);
      }
      function isSmallStraight(d) {
        const unique = Array.from(new Set(d)).sort().join("");
        return unique.includes("1234") || unique.includes("2345") || unique.includes("3456");
      }
      function isLargeStraight(d) {
        const unique = Array.from(new Set(d)).sort().join("");
        return unique === "12345" || unique === "23456";
      }

      function getCubeTransform(idx, value) {
        const rx = rollRotations[idx].x;
        const ry = rollRotations[idx].y;
        switch (value) {
          case 1: return 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
          case 6: return 'rotateX(' + rx + 'deg) rotateY(' + (ry + 180) + 'deg)';
          case 3: return 'rotateX(' + rx + 'deg) rotateY(' + (ry + 90) + 'deg)';
          case 4: return 'rotateX(' + rx + 'deg) rotateY(' + (ry - 90) + 'deg)';
          case 2: return 'rotateX(' + (rx - 90) + 'deg) rotateY(' + ry + 'deg)';
          case 5: return 'rotateX(' + (rx + 90) + 'deg) rotateY(' + ry + 'deg)';
          default: return 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
        }
      }

      function updateDiceUI() {
        const scenes = DOM.diceContainer.querySelectorAll('.die-scene');
        scenes.forEach((scene, idx) => {
          scene.classList.toggle('kept', diceKept[idx]);
          const cube = scene.querySelector('.die-cube');
          if (cube) cube.style.transform = getCubeTransform(idx, diceValues[idx]);
        });
      }

      function toggleKeep(idx) {
        if (!gameActive || !isMyTurn || rollCount === 0) return;
        diceKept[idx] = !diceKept[idx];
        updateDiceUI();
        if (!isSolo) sendGameState(false);
      }

      function updateGameStatus() {
        if (!gameActive) {
          DOM.statusBar.textContent = "対戦相手を待っています...";
          DOM.btnRoll.disabled = true;
          return;
        }
        if (isMyTurn) {
          DOM.statusBar.textContent = "🟢 あなたの番です。ダイスを振るか、得点表の確定させたい役をクリックしてください。";
          DOM.btnRoll.disabled = rollCount >= 3;
        } else {
          DOM.statusBar.textContent = "🔴 " + oppName + " の手番です。相手のプレイを待っています...";
          DOM.btnRoll.disabled = true;
        }
      }

      function checkGameOver() {
        const myDone = CATEGORIES.every(cat => myScores[cat.id] !== undefined);
        const oppDone = isSolo || CATEGORIES.every(cat => oppScores[cat.id] !== undefined);
        if (myDone && oppDone) {
          gameActive = false;
          const myTotal = Object.values(myScores).reduce((a, b) => a + b, 0);
          const oppTotal = isSolo ? 0 : Object.values(oppScores).reduce((a, b) => a + b, 0);
          let resultMsg = "ゲーム終了！あなたの最終得点: " + myTotal + "点";
          if (!isSolo) {
            resultMsg += " 対 " + oppName + ": " + oppTotal + "点 — ";
            if (myTotal > oppTotal) resultMsg += "🏆 あなたの勝ちです！";
            else if (myTotal < oppTotal) resultMsg += "敗北しました...";
            else resultMsg += "引き分けです！";
          } else {
            resultMsg += " (ソロ練習終了)";
          }
          DOM.statusBar.textContent = resultMsg;
          DOM.btnRoll.disabled = true;
        }
      }

      function updateScoreboard() {
        DOM.scoreRows.innerHTML = '';
        CATEGORIES.forEach(cat => {
          const tr = document.createElement('tr');
          tr.className = 'score-row';
          if (myScores[cat.id] !== undefined) tr.classList.add('scored');
          const tdName = document.createElement('td');
          tdName.textContent = cat.name;
          const tdMy = document.createElement('td');
          tdMy.className = 'score-val';
          if (myScores[cat.id] !== undefined) {
            tdMy.textContent = myScores[cat.id];
          } else if (rollCount > 0 && isMyTurn && gameActive) {
            tdMy.textContent = cat.calc(diceValues);
            tdMy.classList.add('potential');
            tr.addEventListener('click', () => selectCategory(cat.id));
          } else {
            tdMy.textContent = '-';
          }
          const tdOpp = document.createElement('td');
          tdOpp.className = 'score-val';
          tdOpp.textContent = oppScores[cat.id] !== undefined ? oppScores[cat.id] : '-';
          if (isSolo) tdOpp.style.display = 'none';
          tr.appendChild(tdName);
          tr.appendChild(tdMy);
          tr.appendChild(tdOpp);
          DOM.scoreRows.appendChild(tr);
        });

        const totalTr = document.createElement('tr');
        totalTr.style.background = 'rgba(255,255,255,0.05)';
        totalTr.style.fontWeight = 'bold';
        const tdTotalName = document.createElement('td');
        tdTotalName.textContent = '合計得点';
        const tdMyTotal = document.createElement('td');
        tdMyTotal.className = 'score-val';
        tdMyTotal.textContent = Object.values(myScores).reduce((a, b) => a + b, 0);
        const tdOppTotal = document.createElement('td');
        tdOppTotal.className = 'score-val';
        tdOppTotal.textContent = Object.values(oppScores).reduce((a, b) => a + b, 0);
        if (isSolo) tdOppTotal.style.display = 'none';
        totalTr.appendChild(tdTotalName);
        totalTr.appendChild(tdMyTotal);
        totalTr.appendChild(tdOppTotal);
        DOM.scoreRows.appendChild(totalTr);
      }

      function selectCategory(catId) {
        if (!isMyTurn || myScores[catId] !== undefined || rollCount === 0 || !gameActive) return;
        const score = CATEGORIES.find(c => c.id === catId).calc(diceValues);
        myScores[catId] = score;
        diceKept = [false, false, false, false, false];
        rollCount = 0;
        if (isSolo) {
          isMyTurn = true;
          checkGameOver();
        } else {
          isMyTurn = false;
          sendGameState(true);
          checkGameOver();
        }
        DOM.btnRoll.textContent = "サイコロを振る (残り3回)";
        updateScoreboard();
        updateDiceUI();
        if (gameActive) updateGameStatus();
      }

      function rollDice() {
        if (!isMyTurn || rollCount >= 3 || !gameActive) return;
        for (let i = 0; i < 5; i++) {
          if (!diceKept[i]) {
            diceValues[i] = Math.floor(Math.random() * 6) + 1;
            rollRotations[i].x += 720 + Math.floor(Math.random() * 4) * 90;
            rollRotations[i].y += 720 + Math.floor(Math.random() * 4) * 90;
          }
        }
        rollCount++;
        DOM.btnRoll.textContent = "サイコロを振る (残り" + (3 - rollCount) + "回)";
        if (rollCount >= 3) DOM.btnRoll.disabled = true;
        updateDiceUI();
        updateScoreboard();
        updateGameStatus();
        if (!isSolo) sendGameState(false);
      }

      function joinRoom(roomCode) {
        showLobbyNotice('');
        if (gameChannel) {
          try { gameChannel.close(); } catch (e) {}
          gameChannel = null;
        }
        isSolo = false;
        oppId = null;
        oppName = "対戦相手";
        gameActive = false;
        isMyTurn = false;
        DOM.colOpp.style.display = 'table-cell';
        DOM.headerText.textContent = "Yacht Room: " + roomCode;
        DOM.lobby.style.display = 'none';
        DOM.game.style.display = 'flex';
        myScores = {};
        oppScores = {};
        rollCount = 0;
        diceValues = [1, 1, 1, 1, 1];
        diceKept = [false, false, false, false, false];
        updateDiceUI();
        updateScoreboard();
        updateGameStatus();

        gameChannel = createGameWsChannel('yacht-' + roomCode, { memberId: myId, username: myName });
        gameChannel
          .on('broadcast', { event: 'join' }, ({ payload }) => {
            if (!payload || payload.id === myId) return;
            const firstMeet = !oppId;
            oppId = payload.id;
            oppName = payload.name || "対戦相手";
            const amHost = firstMeet ? (!gameActive || myId < payload.id) : isMyTurn;
            if (amHost || !payload.isResponse) {
              gameChannel.send({ type: 'broadcast', event: 'welcome', payload: { id: myId, name: myName, scores: myScores, guestStarts: !amHost } });
            }
            if (!gameActive) {
              gameActive = true;
              isMyTurn = amHost;
              updateGameStatus();
              updateScoreboard();
              updateDiceUI();
            }
          })
          .on('broadcast', { event: 'welcome' }, ({ payload }) => {
            if (!payload || payload.id === myId) return;
            oppId = payload.id;
            oppName = payload.name || "対戦相手";
            oppScores = payload.scores || {};
            if (!gameActive) {
              gameActive = true;
              isMyTurn = !!payload.guestStarts;
              updateGameStatus();
              updateScoreboard();
              updateDiceUI();
            }
          })
          .on('relay_member_joined', ({ payload }) => {
            if (payload && payload.memberId && payload.memberId !== myId) {
              gameChannel.send({ type: 'broadcast', event: 'join', payload: { id: myId, name: myName, isResponse: true } });
            }
          })
          .on('broadcast', { event: 'state' }, ({ payload }) => {
            if (payload && payload.id !== myId) {
              diceValues = payload.diceValues || [1, 1, 1, 1, 1];
              oppScores = payload.scores || {};
              if (payload.turnEnded) {
                isMyTurn = true;
                rollCount = 0;
                diceKept = [false, false, false, false, false];
                DOM.btnRoll.textContent = "サイコロを振る (残り3回)";
                DOM.btnRoll.disabled = false;
              }
              updateDiceUI();
              updateScoreboard();
              updateGameStatus();
              checkGameOver();
            }
          })
          .on('broadcast', { event: 'leave' }, () => {
            leaveGame("対戦相手が退出しました。");
          })
          .on('relay_member_left', ({ payload }) => {
            if (payload && payload.memberId && payload.memberId === oppId) {
              leaveGame("対戦相手の接続が切れました。");
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              gameChannel.send({ type: 'broadcast', event: 'join', payload: { id: myId, name: myName } });
            } else if (status === 'CHANNEL_ERROR') {
              leaveGame("オンラインサーバーへの接続に失敗しました。");
            }
          });
      }

      function sendGameState(turnEnded = false) {
        if (!gameChannel) return;
        gameChannel.send({
          type: 'broadcast',
          event: 'state',
          payload: { id: myId, diceValues: diceValues, scores: myScores, turnEnded: turnEnded }
        });
      }

      function startSoloPlay() {
        showLobbyNotice('');
        isSolo = true;
        DOM.colOpp.style.display = 'none';
        DOM.headerText.textContent = "We talks Yacht (Solo)";
        DOM.lobby.style.display = 'none';
        DOM.game.style.display = 'flex';
        gameActive = true;
        isMyTurn = true;
        myScores = {};
        oppScores = {};
        rollCount = 0;
        diceValues = [1, 1, 1, 1, 1];
        diceKept = [false, false, false, false, false];
        updateDiceUI();
        updateScoreboard();
        updateGameStatus();
      }

      function leaveGame(noticeMsg) {
        if (gameChannel) {
          try {
            gameChannel.send({ type: 'broadcast', event: 'leave', payload: { id: myId } });
            gameChannel.close();
          } catch (e) {}
          gameChannel = null;
        }
        isSolo = false;
        gameActive = false;
        isMyTurn = false;
        oppId = null;
        myScores = {};
        oppScores = {};
        DOM.lobby.style.display = 'flex';
        DOM.game.style.display = 'none';
        DOM.headerText.textContent = "We talks Yacht Dice";
        if (typeof noticeMsg === 'string' && noticeMsg) {
          showLobbyNotice(noticeMsg);
        }
      }

      window.addEventListener('beforeunload', () => {
        if (gameChannel) {
          try {
            gameChannel.send({ type: 'broadcast', event: 'leave', payload: { id: myId } });
            gameChannel.close();
          } catch (e) {}
        }
      });

      DOM.btnJoin.addEventListener('click', () => {
        const code = DOM.roomCode.value.trim();
        if (code) joinRoom(code);
        else showLobbyNotice('部屋コードを入力してください。');
      });
      DOM.btnSolo.addEventListener('click', startSoloPlay);
      DOM.btnLeave.addEventListener('click', () => leaveGame(''));
      DOM.btnRoll.addEventListener('click', rollDice);

      DOM.diceContainer.querySelectorAll('.die-scene').forEach(scene => {
        scene.addEventListener('click', () => {
          const idx = parseInt(scene.getAttribute('data-idx'));
          toggleKeep(idx);
        });
      });
    })();
  </script>
</body>
</html>`;

// We talks: 2. UNO風ゲーム（UNO Card Game）のHTMLソース
export const UNO_GAME_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>We talks UNO</title>
  <style>
    :root {
      --primary: #06C755;
      --bg: #151515;
      --panel: #222222;
      --text: #f5f5f5;
      --text-dim: #999;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; margin: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg); color: var(--text); padding: 12px; display: flex; flex-direction: column; overflow: hidden;
    }
    .header { background: var(--primary); padding: 12px; font-weight: bold; border-radius: 8px; text-align: center; margin-bottom: 12px; flex-shrink: 0; font-size:16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .lobby-screen, .game-screen { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .btn { background: var(--primary); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: center; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); transition: background-color 0.15s; }
    .btn:hover { background: #05b042; }
    .btn.secondary { background: #444; }
    .btn.secondary:hover { background: #333; }
    .game-area { display: flex; flex-direction: column; flex: 1; justify-content: space-between; overflow: hidden; gap: 8px; }
    .opponent-hand-area { background: var(--panel); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .opponent-cards { display: flex; gap: -15px; }
    .card-back {
      width: 44px; height: 66px; background: radial-gradient(circle, #f43f5e 60%, #9f1239 100%);
      border: 2px solid white; border-radius: 6px; display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: bold; color: yellow; transform: scale(0.9); box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .field-area { display: flex; flex: 1; align-items: center; justify-content: center; gap: 32px; background: rgba(255,255,255,0.02); border-radius: 8px; position: relative; }
    .pile-container { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .card {
      width: 54px; height: 80px; border-radius: 8px; border: 3px solid white;
      display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;
      color: white; cursor: pointer; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      user-select: none; transition: transform 0.12s, margin-top 0.12s;
    }
    .card:hover { transform: translateY(-8px) scale(1.05); z-index: 10; }
    .card.red { background: linear-gradient(135deg, #ef4444, #b91c1c); }
    .card.yellow { background: linear-gradient(135deg, #eab308, #a16207); color: #000; border-color: #000; }
    .card.green { background: linear-gradient(135deg, #22c55e, #15803d); }
    .card.blue { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .card.wild { background: linear-gradient(135deg, #1e1e1e, #111111); }
    .player-hand-area { background: var(--panel); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; }
    .player-cards { display: flex; gap: 4px; overflow-x: auto; width: 100%; justify-content: center; padding: 6px 0; }
    .status-bar { padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 13px; text-align: center; font-weight: bold; width: 100%; }

    @keyframes slideInFromDeck {
      0% { transform: translateY(-200px) rotate(45deg); opacity: 0; }
      100% { transform: translateY(0) rotate(0deg); opacity: 1; }
    }
    .card.drawn-anim { animation: slideInFromDeck 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; }

    @keyframes slideToDiscard {
      0% { transform: translateY(120px) scale(1.1) rotate(-10deg); opacity: 0.5; }
      100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
    }
    .card.played-anim { animation: slideToDiscard 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards; }

    @keyframes slideToDiscardFromOpp {
      0% { transform: translateY(-120px) scale(1.1) rotate(10deg); opacity: 0.5; }
      100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
    }
    .card.played-opp-anim { animation: slideToDiscardFromOpp 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
    .notice-banner { display: none; margin-bottom: 10px; padding: 8px 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.18); border: 1px solid rgba(239, 68, 68, 0.4); color: #fecaca; font-size: 12px; font-weight: bold; text-align: center; }
    .notice-banner.active { display: block; }
  </style>
</head>
<body>
  <div class="header" id="header-text">We talks UNO</div>

  <div class="lobby-screen" id="lobby-screen">
    <div id="lobby-notice" class="notice-banner"></div>
    <div style="font-size: 13px; color: var(--text-dim); margin-bottom: 12px; text-align: center;">部屋コードを指定してオンライン対戦相手と繋がります</div>
    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <input type="text" id="input-room-code" placeholder="部屋コードを入力 (例: 888)" style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #475569; background: var(--panel); color: white; outline: none; font-size: 14px;" />
      <button class="btn" id="btn-join-room">部屋に入る / 作成</button>
    </div>
    <button class="btn secondary" id="btn-ai-play" style="width: 100%;">練習用AI対戦プレイ (オフライン)</button>
  </div>

  <div class="game-screen" id="game-screen" style="display: none;">
    <div class="game-area">
      <div class="opponent-hand-area">
        <span id="opp-name-tag" style="font-size: 12px; font-weight: bold;">AI対戦相手 (手札: 7枚)</span>
        <div class="opponent-cards" id="opp-cards-container"></div>
      </div>
      <div class="field-area">
        <div class="pile-container">
          <div class="card-back" id="btn-draw" style="cursor: pointer; width: 56px; height: 82px; font-size: 11px;">山札<br>引く</div>
        </div>
        <div class="pile-container">
          <span style="font-size:11px; color: var(--text-dim);">場札</span>
          <div id="discard-card-container"></div>
        </div>
        <button class="btn" id="btn-end-turn" style="display: none; position: absolute; left: 12px; bottom: 12px; padding: 6px 12px; font-size:11px; background:#f59e0b;">ターン終了</button>
        <button class="btn secondary" id="btn-leave-game" style="position: absolute; right: 12px; bottom: 12px; padding: 6px 12px; font-size:11px;">退出</button>
      </div>
      <div class="player-hand-area">
        <div class="status-bar" id="status-bar">山札から引くか、出せるカードを出してください。</div>
        <div class="player-cards" id="player-cards-container"></div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      'use strict';

      let localStorage;
      try {
        window.localStorage.getItem('test');
        localStorage = window.localStorage;
      } catch (e) {
        localStorage = {
          _data: {},
          getItem: function(k) { return this._data[k] !== undefined ? this._data[k] : null; },
          setItem: function(k, v) { this._data[k] = String(v); },
          removeItem: function(k) { delete this._data[k]; },
          clear: function() { this._data = {}; }
        };
      }

      let sessionStorage;
      try {
        window.sessionStorage.getItem('test');
        sessionStorage = window.sessionStorage;
      } catch (e) {
        sessionStorage = {
          _data: {},
          getItem: function(k) { return this._data[k] !== undefined ? this._data[k] : null; },
          setItem: function(k, v) { this._data[k] = String(v); },
          removeItem: function(k) { delete this._data[k]; },
          clear: function() { this._data = {}; }
        };
      }

      function resolveGameWsUrl() {
        let origin = '';
        try {
          if (window.parent && window.parent.location && window.parent.location.origin && window.parent.location.origin !== 'null') {
            origin = window.parent.location.origin;
          }
        } catch (e) {}
        if (!origin) {
          try {
            const saved = localStorage.getItem('webos_app_origin');
            if (saved && saved !== 'null') origin = saved;
          } catch (e) {}
        }
        if (!origin && document.referrer && document.referrer.startsWith('http')) {
          try { origin = new URL(document.referrer).origin; } catch (e) {}
        }
        if (!origin && window.location && window.location.origin && window.location.origin !== 'null') {
          origin = window.location.origin;
        }
        if (!origin) return null;
        return origin.replace(/^http/i, 'ws') + '/ws';
      }

      function createGameWsChannel(channelName, meta) {
        const wsUrl = resolveGameWsUrl();
        const handlers = new Map();
        let ws = null;
        let joined = false;
        let closed = false;
        const queue = [];
        let pingTimer = null;

        function emit(ev, payload) {
          const list = handlers.get(ev);
          if (list) list.forEach(fn => { try { fn({ payload }); } catch (e) {} });
        }

        function sendRaw(obj) {
          if (closed) return;
          if (ws && ws.readyState === 1 && joined) {
            try { ws.send(JSON.stringify(obj)); } catch (e) {}
          } else {
            queue.push(obj);
          }
        }

        const api = {
          on(typeOrEvent, filterOrFn, maybeFn) {
            const ev = (typeof filterOrFn === 'object' && filterOrFn && filterOrFn.event) ? filterOrFn.event : typeOrEvent;
            const fn = typeof maybeFn === 'function' ? maybeFn : (typeof filterOrFn === 'function' ? filterOrFn : null);
            if (ev && fn) {
              if (!handlers.has(ev)) handlers.set(ev, []);
              handlers.get(ev).push(fn);
            }
            return api;
          },
          send(msg) {
            sendRaw({
              type: 'relay_broadcast',
              channel: channelName,
              event: msg.event,
              payload: msg.payload || {}
            });
          },
          subscribe(cb) {
            if (!wsUrl) {
              if (cb) cb('CHANNEL_ERROR');
              return api;
            }
            try {
              ws = new WebSocket(wsUrl);
              ws.onopen = () => {
                if (closed) return;
                ws.send(JSON.stringify({
                  type: 'relay_join',
                  channel: channelName,
                  memberId: meta.memberId,
                  username: meta.username
                }));
                pingTimer = setInterval(() => {
                  if (ws && ws.readyState === 1) {
                    try { ws.send(JSON.stringify({ type: 'ping' })); } catch (e) {}
                  }
                }, 20000);
              };
              ws.onmessage = (e) => {
                try {
                  const data = JSON.parse(e.data);
                  if (data.type === 'relay_joined' && data.channel === channelName) {
                    joined = true;
                    while (queue.length > 0 && ws && ws.readyState === 1) {
                      ws.send(JSON.stringify(queue.shift()));
                    }
                    if (cb) cb('SUBSCRIBED');
                  } else if (data.type === 'relay_event' && data.channel === channelName) {
                    emit(data.event, data.payload || {});
                  } else if (data.type === 'relay_member_joined' && data.channel === channelName) {
                    emit('relay_member_joined', { memberId: data.memberId, username: data.username });
                  } else if (data.type === 'relay_member_left' && data.channel === channelName) {
                    emit('relay_member_left', { memberId: data.memberId, username: data.username });
                  }
                } catch (err) {}
              };
              ws.onerror = () => { if (cb) cb('CHANNEL_ERROR'); };
              ws.onclose = () => {
                joined = false;
                if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
              };
            } catch (e) {
              if (cb) cb('CHANNEL_ERROR');
            }
            return api;
          },
          close() {
            closed = true;
            if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
            if (ws) {
              if (ws.readyState === 1) {
                try { ws.send(JSON.stringify({ type: 'relay_leave', channel: channelName })); } catch (e) {}
              }
              try { ws.close(); } catch (e) {}
              ws = null;
            }
          }
        };
        return api;
      }

      let gameChannel = null;
      let isSolo = false;
      let myId = 'p-' + Math.floor(1000 + Math.random() * 9000);
      let myName = (function() {
        try {
          return sessionStorage.getItem('wetalks_session_user') || localStorage.getItem('wetalks_logged_in_user') || 'ゲスト';
        } catch (e) { return 'ゲスト'; }
      })();
      let oppId = null;
      let oppName = "対戦相手";
      let myHand = [];
      let oppHandCount = 0;
      let oppHand = [];
      let discardPile = [];
      let activeColor = '';
      let isMyTurn = false;
      let gameActive = false;
      let stackedValue = null; 
      let lastAction = null;

      const COLORS = ['red', 'yellow', 'green', 'blue'];
      const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Draw2'];

      const DOM = {
        lobby: document.getElementById('lobby-screen'),
        lobbyNotice: document.getElementById('lobby-notice'),
        game: document.getElementById('game-screen'),
        roomCode: document.getElementById('input-room-code'),
        btnJoin: document.getElementById('btn-join-room'),
        btnAI: document.getElementById('btn-ai-play'),
        statusBar: document.getElementById('status-bar'),
        btnDraw: document.getElementById('btn-draw'),
        btnLeave: document.getElementById('btn-leave-game'),
        btnEndTurn: document.getElementById('btn-end-turn'),
        oppNameTag: document.getElementById('opp-name-tag'),
        oppCardsContainer: document.getElementById('opp-cards-container'),
        playerCardsContainer: document.getElementById('player-cards-container'),
        discardContainer: document.getElementById('discard-card-container'),
        headerText: document.getElementById('header-text')
      };

      function showLobbyNotice(msg) {
        if (!DOM.lobbyNotice) return;
        if (!msg) {
          DOM.lobbyNotice.textContent = '';
          DOM.lobbyNotice.classList.remove('active');
        } else {
          DOM.lobbyNotice.textContent = msg;
          DOM.lobbyNotice.classList.add('active');
        }
      }

      function createRandomCard() {
        if (Math.random() < 0.1) return { color: 'wild', value: 'Wild' };
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const value = VALUES[Math.floor(Math.random() * VALUES.length)];
        return { color, value };
      }

      function buildCardDOM(card, isPlayable = false, clickHandler = null) {
        const div = document.createElement('div');
        div.className = 'card ' + card.color;
        let label = card.value;
        if (card.value === 'Draw2') label = '+2';
        if (card.value === 'Wild') label = 'W';
        div.textContent = label;
        if (isPlayable && clickHandler) div.addEventListener('click', clickHandler);
        return div;
      }

      function updateUI() {
        if (!gameActive) {
          DOM.discardContainer.innerHTML = '';
          DOM.playerCardsContainer.innerHTML = '';
          DOM.oppCardsContainer.innerHTML = '';
          DOM.oppNameTag.textContent = "対戦相手を待っています...";
          DOM.statusBar.textContent = "対戦相手が参加するまでお待ちください...";
          DOM.btnDraw.style.pointerEvents = 'none';
          DOM.btnDraw.style.opacity = '0.5';
          return;
        }
        DOM.discardContainer.innerHTML = '';
        if (discardPile.length > 0) {
          const topCard = discardPile[discardPile.length - 1];
          const displayCard = { ...topCard };
          if (topCard.color === 'wild' && activeColor) displayCard.color = activeColor;
          const discardDOM = buildCardDOM(displayCard);
          if (lastAction === 'play_me') discardDOM.classList.add('played-anim');
          else if (lastAction === 'play_opp') discardDOM.classList.add('played-opp-anim');
          DOM.discardContainer.appendChild(discardDOM);
        }

        DOM.playerCardsContainer.innerHTML = '';
        myHand.forEach((card, idx) => {
          const playable = isMyTurn && canPlay(card);
          const dom = buildCardDOM(card, playable, () => playCard(idx));
          if (!playable) dom.style.opacity = '0.5';
          if (lastAction === 'draw' && idx === myHand.length - 1) dom.classList.add('drawn-anim');
          DOM.playerCardsContainer.appendChild(dom);
        });

        DOM.oppCardsContainer.innerHTML = '';
        const count = isSolo ? oppHand.length : oppHandCount;
        for (let i = 0; i < count; i++) {
          const cardBack = document.createElement('div');
          cardBack.className = 'card-back';
          cardBack.textContent = 'UNO';
          DOM.oppCardsContainer.appendChild(cardBack);
        }
        DOM.oppNameTag.textContent = oppName + " (手札: " + count + "枚)";

        if (isMyTurn) {
          if (stackedValue !== null) {
            DOM.statusBar.textContent = "🟢 同数字（" + stackedValue + "）の連続出しが可能です。出さない場合は「ターン終了」を押してください。";
            DOM.btnDraw.style.pointerEvents = 'none';
            DOM.btnDraw.style.opacity = '0.5';
          } else {
            DOM.statusBar.textContent = "🟢 あなたの手番です。場札に合うカードを出すか、山札から引いてください。";
            DOM.btnDraw.style.pointerEvents = 'auto';
            DOM.btnDraw.style.opacity = '1';
          }
        } else {
          DOM.statusBar.textContent = "🔴 " + oppName + " の手番です。相手の操作を待っています...";
          DOM.btnDraw.style.pointerEvents = 'none';
          DOM.btnDraw.style.opacity = '0.5';
        }
        lastAction = null;
        checkGameOver();
      }

      function canPlay(card) {
        if (stackedValue !== null) return card.value === stackedValue;
        if (discardPile.length === 0) return true;
        const top = discardPile[discardPile.length - 1];
        if (card.color === 'wild') return true;
        const topColor = top.color === 'wild' ? activeColor : top.color;
        if (card.color === topColor) return true;
        if (card.value === top.value) return true;
        return false;
      }

      function playCard(idx) {
        if (!isMyTurn || !gameActive) return;
        const card = myHand.splice(idx, 1)[0];
        discardPile.push(card);
        lastAction = 'play_me';
        if (card.color === 'wild') {
          activeColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        } else {
          activeColor = card.color;
        }
        const hasMoreSameValue = myHand.length > 0 && myHand.some(c => c.value === card.value);
        if (hasMoreSameValue) {
          stackedValue = card.value;
          DOM.btnEndTurn.style.display = 'block';
          updateUI();
        } else {
          endMyTurn(card);
        }
      }

      function endMyTurn(card) {
        stackedValue = null;
        DOM.btnEndTurn.style.display = 'none';
        let turnSkip = false;
        let drawPenalty = 0;
        if (card.value === 'Skip') turnSkip = true;
        if (card.value === 'Draw2') drawPenalty = 2;

        if (isSolo) {
          isMyTurn = false;
          updateUI();
          if (!gameActive) return;
          if (drawPenalty > 0) {
            for (let i = 0; i < drawPenalty; i++) oppHand.push(createRandomCard());
          }
          if (turnSkip) {
            isMyTurn = true;
            setTimeout(updateUI, 1000);
          } else {
            setTimeout(aiTurn, 1500);
          }
        } else {
          // If I played Skip (and still have cards), I keep my turn directly without ping-pong ambiguity
          isMyTurn = turnSkip && myHand.length > 0;
          sendGameState(turnSkip, drawPenalty);
          updateUI();
        }
      }

      function drawCard() {
        if (!isMyTurn || stackedValue !== null || !gameActive) return;
        myHand.push(createRandomCard());
        lastAction = 'draw';
        isMyTurn = false;
        if (isSolo) {
          updateUI();
          setTimeout(aiTurn, 1200);
        } else {
          sendGameState(false, 0);
          updateUI();
        }
      }

      function checkGameOver() {
        if (!gameActive) return;
        if (myHand.length === 0) {
          gameActive = false;
          isMyTurn = false;
          DOM.statusBar.textContent = "🏆 あなたの勝利！すべてのカードを出し切りました！";
          DOM.btnDraw.style.pointerEvents = 'none';
          DOM.btnDraw.style.opacity = '0.5';
        } else if ((isSolo && oppHand.length === 0) || (!isSolo && oppHandCount === 0 && oppId)) {
          gameActive = false;
          isMyTurn = false;
          DOM.statusBar.textContent = "敗北... " + oppName + " が先にカードを出し切りました。";
          DOM.btnDraw.style.pointerEvents = 'none';
          DOM.btnDraw.style.opacity = '0.5';
        }
      }

      function aiTurn() {
        if (!gameActive) return;
        let playIdx = -1;
        for (let i = 0; i < oppHand.length; i++) {
          if (canPlay(oppHand[i])) {
            playIdx = i;
            break;
          }
        }
        if (playIdx !== -1) {
          const card = oppHand.splice(playIdx, 1)[0];
          discardPile.push(card);
          lastAction = 'play_opp';
          let turnSkip = false;
          let drawPenalty = 0;
          if (card.color === 'wild') {
            activeColor = COLORS[Math.floor(Math.random() * COLORS.length)];
          } else {
            activeColor = card.color;
          }
          if (card.value === 'Skip') turnSkip = true;
          if (card.value === 'Draw2') drawPenalty = 2;
          if (drawPenalty > 0) {
            for (let i = 0; i < drawPenalty; i++) myHand.push(createRandomCard());
          }
          if (turnSkip) setTimeout(aiTurn, 1500);
          else isMyTurn = true;
        } else {
          oppHand.push(createRandomCard());
          lastAction = 'draw_opp';
          isMyTurn = true;
        }
        updateUI();
      }

      function joinRoom(roomCode) {
        showLobbyNotice('');
        if (gameChannel) {
          try { gameChannel.close(); } catch (e) {}
          gameChannel = null;
        }
        isSolo = false;
        oppId = null;
        oppName = "対戦相手";
        gameActive = false;
        isMyTurn = false;
        stackedValue = null;
        DOM.btnEndTurn.style.display = 'none';
        DOM.headerText.textContent = "UNO Room: " + roomCode;
        DOM.lobby.style.display = 'none';
        DOM.game.style.display = 'flex';
        myHand = Array.from({ length: 7 }, createRandomCard);
        oppHandCount = 7;
        discardPile = [{ color: 'red', value: '5' }];
        activeColor = 'red';
        updateUI();

        gameChannel = createGameWsChannel('uno-' + roomCode, { memberId: myId, username: myName });
        gameChannel
          .on('broadcast', { event: 'join' }, ({ payload }) => {
            if (!payload || payload.id === myId) return;
            const firstMeet = !oppId;
            oppId = payload.id;
            oppName = payload.name || "対戦相手";
            const amHost = firstMeet ? (!gameActive || myId < payload.id) : isMyTurn;
            if (amHost || !payload.isResponse) {
              gameChannel.send({
                type: 'broadcast',
                event: 'welcome',
                payload: {
                  id: myId,
                  name: myName,
                  handCount: myHand.length,
                  discard: discardPile,
                  activeColor: activeColor,
                  guestStarts: !amHost
                }
              });
            }
            if (!gameActive) {
              gameActive = true;
              isMyTurn = amHost;
              updateUI();
            }
          })
          .on('broadcast', { event: 'welcome' }, ({ payload }) => {
            if (!payload || payload.id === myId) return;
            oppId = payload.id;
            oppName = payload.name || "対戦相手";
            oppHandCount = typeof payload.handCount === 'number' ? payload.handCount : 7;
            if (Array.isArray(payload.discard) && payload.discard.length > 0) {
              discardPile = payload.discard;
            }
            if (payload.activeColor) activeColor = payload.activeColor;
            if (!gameActive) {
              gameActive = true;
              isMyTurn = !!payload.guestStarts;
              updateUI();
            }
          })
          .on('relay_member_joined', ({ payload }) => {
            if (payload && payload.memberId && payload.memberId !== myId) {
              gameChannel.send({ type: 'broadcast', event: 'join', payload: { id: myId, name: myName, isResponse: true } });
            }
          })
          .on('broadcast', { event: 'state' }, ({ payload }) => {
            if (!payload || payload.id === myId) return;
            if (payload.handCount < oppHandCount) lastAction = 'play_opp';
            else if (payload.handCount > oppHandCount) lastAction = 'draw_opp';
            oppHandCount = payload.handCount;
            if (Array.isArray(payload.discard)) discardPile = payload.discard;
            if (payload.activeColor) activeColor = payload.activeColor;
            if (payload.drawPenalty > 0) {
              for (let i = 0; i < payload.drawPenalty; i++) myHand.push(createRandomCard());
            }
            isMyTurn = !payload.turnSkip;
            updateUI();
          })
          .on('broadcast', { event: 'leave' }, () => {
            leaveGame("対戦相手が退出しました。");
          })
          .on('relay_member_left', ({ payload }) => {
            if (payload && payload.memberId && payload.memberId === oppId) {
              leaveGame("対戦相手の接続が切れました。");
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              gameChannel.send({ type: 'broadcast', event: 'join', payload: { id: myId, name: myName } });
            } else if (status === 'CHANNEL_ERROR') {
              leaveGame("オンラインサーバーへの接続に失敗しました。");
            }
          });
      }

      function sendGameState(turnSkip = false, drawPenalty = 0) {
        if (!gameChannel) return;
        gameChannel.send({
          type: 'broadcast',
          event: 'state',
          payload: { id: myId, handCount: myHand.length, discard: discardPile, activeColor: activeColor, turnSkip: turnSkip, drawPenalty: drawPenalty }
        });
      }

      function startAIGame() {
        showLobbyNotice('');
        isSolo = true;
        oppName = "AI対戦相手";
        DOM.headerText.textContent = "We talks UNO (vs AI)";
        DOM.lobby.style.display = 'none';
        DOM.game.style.display = 'flex';
        myHand = Array.from({ length: 7 }, createRandomCard);
        oppHand = Array.from({ length: 7 }, createRandomCard);
        discardPile = [{ color: 'blue', value: '7' }];
        activeColor = 'blue';
        stackedValue = null;
        DOM.btnEndTurn.style.display = 'none';
        gameActive = true;
        isMyTurn = true;
        updateUI();
      }

      function leaveGame(noticeMsg) {
        if (gameChannel) {
          try {
            gameChannel.send({ type: 'broadcast', event: 'leave', payload: { id: myId } });
            gameChannel.close();
          } catch (e) {}
          gameChannel = null;
        }
        isSolo = false;
        gameActive = false;
        isMyTurn = false;
        oppId = null;
        stackedValue = null;
        DOM.btnEndTurn.style.display = 'none';
        DOM.lobby.style.display = 'flex';
        DOM.game.style.display = 'none';
        DOM.headerText.textContent = "We talks UNO";
        if (typeof noticeMsg === 'string' && noticeMsg) {
          showLobbyNotice(noticeMsg);
        }
      }

      window.addEventListener('beforeunload', () => {
        if (gameChannel) {
          try {
            gameChannel.send({ type: 'broadcast', event: 'leave', payload: { id: myId } });
            gameChannel.close();
          } catch (e) {}
        }
      });

      DOM.btnJoin.addEventListener('click', () => {
        const code = DOM.roomCode.value.trim();
        if (code) joinRoom(code);
        else showLobbyNotice('部屋コードを入力してください。');
      });
      DOM.btnAI.addEventListener('click', startAIGame);
      DOM.btnLeave.addEventListener('click', () => leaveGame(''));
      DOM.btnDraw.addEventListener('click', drawCard);
      DOM.btnEndTurn.addEventListener('click', () => {
        if (stackedValue !== null) {
          const lastCard = discardPile[discardPile.length - 1];
          endMyTurn(lastCard);
        }
      });
    })();
  </script>
</body>
</html>`;
