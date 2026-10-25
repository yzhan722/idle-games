import type { KeyboardEvent } from "react";
import type { ChatMsg } from "../services/websocket";
import { T1Art } from "./T1Art";
import "./T1UiIcons.css";

type ChatChannel = "world" | "profession" | "party" | "private";

type Props = {
  expanded: boolean;
  onToggle: () => void;
  channel: ChatChannel;
  onSwitchChannel: (channel: ChatChannel) => void;
  /** 当前私聊对象（channel==='private' 时展示） */
  privateTarget?: { id: string; name: string } | null;
  /** 点击消息里的玩家名 → 对其发起私聊 */
  onPrivateChat: (target: { id: string; name: string }) => void;
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
            <button
              className={`channel-btn ${props.channel === "private" ? "active" : ""}`}
              onClick={() => props.onSwitchChannel("private")}
            >
              私聊
              {(props.unread.private || 0) > 0 && <span className="unread-badge">{props.unread.private}</span>}
            </button>
          </div>
          {props.channel === "private" && (
            <div className="chat-private-target">
              {props.privateTarget
                ? <>私聊 → <b>{props.privateTarget.name}</b>（点消息中的玩家名可换人）</>
                : "点任意玩家名字开始私聊"}
            </div>
          )}
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
                    {msg.type === "message" ? (
                      <button
                        className="message-sender sender-btn"
                        type="button"
                        title={`私聊 ${msg.senderName || msg.sender}`}
                        onClick={() =>
                          props.onPrivateChat({
                            id: msg.sender,
                            name: msg.senderName || msg.sender,
                          })
                        }
                      >
                        {msg.senderName || (msg.sender.length > 10 ? msg.sender.slice(0, 8) + "…" : msg.sender)}
                      </button>
                    ) : (
                      <span className="message-sender">{msg.senderName || msg.sender}</span>
                    )}
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
              placeholder={
                props.channel === "private"
                  ? props.privateTarget ? `私聊 ${props.privateTarget.name}...` : "先点击玩家名选择私聊对象"
                  : `发送到${props.channel === "world" ? "世界" : props.channel === "profession" ? "职业" : "队伍"}频道...`
              }
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
