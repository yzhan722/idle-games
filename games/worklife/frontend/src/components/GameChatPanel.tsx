import type { KeyboardEvent } from "react";
import type { ChatMsg } from "../services/websocket";
import { T1Art } from "./T1Art";
import "./T1UiIcons.css";

type ChatChannel = "world" | "profession" | "party";

type Props = {
  expanded: boolean;
  onToggle: () => void;
  channel: ChatChannel;
  onSwitchChannel: (channel: ChatChannel) => void;
  unread: Record<string, number>;
  professionIcon: string;
  wsStatus: "connecting" | "connected" | "disconnected";
  messages: ChatMsg[];
  input: string;
  onInput: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: KeyboardEvent) => void;
  showEmojiPicker: boolean;
  onToggleEmoji: () => void;
  onInsertEmoji: (emoji: string) => void;
};

export function GameChatPanel(props: Props) {
  const visible = props.messages.filter((msg) => msg.channel === props.channel);
  return (
    <aside className={`chat-panel ${props.expanded ? "expanded" : "collapsed"}`}>
      {!props.expanded && (
        <button
          className="chat-fab"
          type="button"
          onClick={props.onToggle}
          title="展开聊天"
          aria-label="展开聊天"
        >
          <T1Art kind="ui" id="chat" fallback="聊" alt="" />
        </button>
      )}
      <div className="chat-header">
        <span className="chat-title">聊天</span>
        <button
          className="chat-toggle"
          type="button"
          onClick={props.onToggle}
          title={props.expanded ? "收起聊天" : "展开聊天"}
          aria-label={props.expanded ? "收起聊天" : "展开聊天"}
          aria-expanded={props.expanded}
        >
          {props.expanded ? "◀" : "▶"}
        </button>
      </div>
      {props.expanded && (
        <>
          <div className="chat-channels">
            <button
              className={`channel-btn ${props.channel === "world" ? "active" : ""}`}
              onClick={() => props.onSwitchChannel("world")}
            >
              世界
              {props.unread.world > 0 && <span className="unread-badge">{props.unread.world}</span>}
            </button>
            <button
              className={`channel-btn ${props.channel === "profession" ? "active" : ""}`}
              onClick={() => props.onSwitchChannel("profession")}
            >
              {props.professionIcon} 职业
              {props.unread.profession > 0 && <span className="unread-badge">{props.unread.profession}</span>}
            </button>
            <button
              className={`channel-btn ${props.channel === "party" ? "active" : ""}`}
              onClick={() => props.onSwitchChannel("party")}
            >
              队伍
              {props.unread.party > 0 && <span className="unread-badge">{props.unread.party}</span>}
            </button>
          </div>
          <div className="chat-messages">
            {props.wsStatus !== "connected" && (
              <div className="chat-status">
                <span className={`status-dot ${props.wsStatus}`}></span>
                {props.wsStatus === "connecting" ? "连接中..." : "已断开，尝试重连中..."}
              </div>
            )}
            {visible.length === 0 ? (
              <div className="chat-empty">
                <p>暂无消息</p>
                <p className="chat-hint">在下方输入框发送消息开始聊天</p>
              </div>
            ) : (
              visible.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message ${msg.isSelf ? "own-message" : ""} ${msg.type === "system" ? "system-message" : ""} ${msg.type === "error" ? "error-message" : ""}`}
                >
                  <div className="message-header">
                    <span className="message-sender">
                      {msg.sender.length > 10 ? msg.sender.slice(0, 8) + "…" : msg.sender}
                    </span>
                    <span className="message-time">
                      {new Date(msg.ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span className="message-text">{msg.content}</span>
                </div>
              ))
            )}
          </div>
          {props.showEmojiPicker && (
            <div className="emoji-picker">
              <div className="emoji-grid">
                {["😀", "😂", "😊", "😍", "🤔", "😎", "👍", "👏", "🎉", "❤️", "🔥", "⭐", "💪", "🙏", "👋", "😭"].map(
                  (emoji) => (
                    <button key={emoji} className="emoji-btn" onClick={() => props.onInsertEmoji(emoji)}>
                      {emoji}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
          <div className="chat-input-area">
            <button className="emoji-toggle-btn" onClick={props.onToggleEmoji} title="表情">
              😀
            </button>
            <input
              type="text"
              className="chat-input"
              placeholder={`发送到${props.channel === "world" ? "世界" : props.channel === "profession" ? "职业" : "队伍"}频道...`}
              value={props.input}
              onChange={(e) => props.onInput(e.target.value)}
              onKeyPress={props.onKeyPress}
              maxLength={200}
            />
            <button className="chat-send-btn" onClick={props.onSend} disabled={!props.input.trim()}>
              发送
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
