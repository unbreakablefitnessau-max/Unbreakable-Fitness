import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dumbbell,
  Edit3,
  Hash,
  MessageSquare,
  Pin,
  Reply,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { VALIDATION_BOUNDS } from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { OperationType, db, handleFirestoreError } from '../firebase';
import { ChatChannel, ChatMessage } from '../types';

interface GroupChatAreaProps {
  pendingAttachment: string | null;
  onClearPendingAttachment: () => void;
}

export const GroupChatArea: React.FC<GroupChatAreaProps> = ({
  pendingAttachment,
  onClearPendingAttachment,
}) => {
  const { firebaseUser, profile, isAdmin, seedStarterClubData } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('general-crew');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  const [draftBody, setDraftBody] = useState('');
  const [attachmentText, setAttachmentText] = useState<string | null>(pendingAttachment);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pendingAttachment) {
      setAttachmentText(pendingAttachment);
      setActiveChannelId('wod-checkins');
      onClearPendingAttachment();
    }
  }, [pendingAttachment, onClearPendingAttachment]);

  useEffect(() => {
    if (!firebaseUser) return;

    const channelsQuery = query(collection(db, 'channels'));
    const unsub = onSnapshot(
      channelsQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ChatChannel);
        list.sort((a, b) => a.name.localeCompare(b.name));
        setChannels(list);
        if (list.length > 0 && !list.some((c) => c.id === activeChannelId)) {
          setActiveChannelId(list[0].id);
        }
        setLoadingChannels(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'channels');
      }
    );

    return () => unsub();
  }, [firebaseUser, activeChannelId]);

  useEffect(() => {
    if (!firebaseUser || !activeChannelId) return;

    setLoadingMessages(true);
    const messagesQuery = query(
      collection(db, 'channels', activeChannelId, 'messages'),
      where('channelId', '==', activeChannelId)
    );

    const unsub = onSnapshot(
      messagesQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ChatMessage);
        list.sort((a, b) => {
          const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? Date.now();
          const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? Date.now();
          return ta - tb;
        });
        setMessages(list);
        setLoadingMessages(false);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `channels/${activeChannelId}/messages`
        );
      }
    );

    return () => unsub();
  }, [firebaseUser, activeChannelId]);

  useEffect(() => {
    if (!searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeChannelId, searchQuery]);

  const activeChannel = useMemo(() => {
    return channels.find((c) => c.id === activeChannelId) || null;
  }, [channels, activeChannelId]);

  const pinnedMessage = useMemo(() => {
    return messages.find((m) => m.pinned) || null;
  }, [messages]);

  const visibleMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.body.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        m.attachmentSummary.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !activeChannel) return;
    if (profile.status === 'suspended') return;

    const cleanBody = draftBody.trim().slice(0, VALIDATION_BOUNDS.MESSAGE_BODY_MAX);
    if (cleanBody.length < VALIDATION_BOUNDS.MESSAGE_BODY_MIN && !attachmentText) return;

    const bodyToSend = cleanBody || 'Post-session check-in';
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setSending(true);
    try {
      await setDoc(doc(db, 'channels', activeChannel.id, 'messages', messageId), {
        id: messageId,
        channelId: activeChannel.id,
        senderId: firebaseUser.uid,
        senderName: profile.displayName.slice(0, VALIDATION_BOUNDS.DISPLAY_NAME_MAX),
        senderRole: isAdmin ? 'Admin' : 'Member',
        body: bodyToSend,
        attachmentType: attachmentText ? 'workout' : 'none',
        attachmentSummary: attachmentText
          ? attachmentText.slice(0, VALIDATION_BOUNDS.ATTACHMENT_SUMMARY_MAX)
          : '',
        pinned: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setDraftBody('');
      setAttachmentText(null);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `channels/${activeChannel.id}/messages/${messageId}`
      );
    } finally {
      setSending(false);
    }
  };

  const handleSaveEditMessage = async (msg: ChatMessage) => {
    const clean = editingBody.trim().slice(0, VALIDATION_BOUNDS.MESSAGE_BODY_MAX);
    if (clean.length < VALIDATION_BOUNDS.MESSAGE_BODY_MIN) return;
    try {
      await updateDoc(doc(db, 'channels', msg.channelId, 'messages', msg.id), {
        body: clean,
        updatedAt: serverTimestamp(),
      });
      setEditingMsgId(null);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `channels/${msg.channelId}/messages/${msg.id}`
      );
    }
  };

  const handleTogglePin = async (msg: ChatMessage) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'channels', msg.channelId, 'messages', msg.id), {
        pinned: !msg.pinned,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `channels/${msg.channelId}/messages/${msg.id}`
      );
    }
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    try {
      await deleteDoc(doc(db, 'channels', msg.channelId, 'messages', msg.id));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `channels/${msg.channelId}/messages/${msg.id}`
      );
    }
  };

  const handleQuoteMessage = (msg: ChatMessage) => {
    const excerpt = msg.body.slice(0, 70).replace(/\n/g, ' ');
    setDraftBody((prev) => `@${msg.senderName} ("${excerpt}") ${prev}`.slice(0, VALIDATION_BOUNDS.MESSAGE_BODY_MAX));
  };

  const formatTime = (ts: unknown) => {
    const date = (ts as { toDate?: () => Date })?.toDate?.();
    if (!date) return 'Just now';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!loadingChannels && channels.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] p-8 text-center">
        <MessageSquare className="h-8 w-8 text-slate-400 mx-auto" aria-hidden="true" />
        <h2 className="mt-3 font-display text-2xl font-bold text-[#090D16] dark:text-white">
          Crew Channels Initializing
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {isAdmin
            ? 'Seed the starter Australian club channels so members can chat in real time.'
            : 'Ask your Unbeatable Fitness AU coach to activate the group channels in Admin.'}
        </p>
        {isAdmin && (
          <button
            type="button"
            onClick={seedStarterClubData}
            className="mt-4 min-h-[44px] px-5 rounded-xl bg-[#FF4D1C] text-sm font-semibold text-white hover:bg-[#E03A0C] cursor-pointer"
          >
            Activate Crew Channels
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-88px)] pb-16 lg:pb-0">
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Channel Selector */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 hidden lg:block">
            <h1 className="font-display text-2xl font-bold text-[#090D16] dark:text-white">
              Club Channels
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unbeatable Fitness AU Community
            </p>
          </div>

          <div className="flex lg:flex-col gap-1.5 p-2 overflow-x-auto lg:overflow-y-auto">
            {channels.map((ch) => {
              const active = ch.id === activeChannelId;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChannelId(ch.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center gap-2.5 text-left transition-colors whitespace-nowrap lg:whitespace-normal shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#090D16] dark:bg-white text-white dark:text-[#090D16]'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Hash
                    className={`h-4 w-4 shrink-0 ${
                      active ? 'text-[#FF4D1C]' : 'text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold truncate">{ch.name}</div>
                    <div
                      className={`hidden lg:block text-[11px] truncate ${
                        active
                          ? 'text-slate-300 dark:text-slate-600'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {ch.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Live Chat Stream */}
        <section className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141923] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-[#FF4D1C] shrink-0" aria-hidden="true" />
                <h2 className="font-display text-xl font-bold text-[#090D16] dark:text-white truncate">
                  {activeChannel?.name || 'Group Chat'}
                </h2>
              </div>
              {activeChannel && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activeChannel.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                {visibleMessages.length} msgs
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen((prev) => !prev);
                  setSearchQuery('');
                }}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Search channel messages"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter messages by text or athlete name..."
                className="flex-1 bg-transparent text-xs text-[#090D16] dark:text-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {pinnedMessage && (
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#0B0E14] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 text-xs">
                <Pin className="h-3.5 w-3.5 text-[#FF4D1C] shrink-0" aria-hidden="true" />
                <span className="font-semibold text-[#090D16] dark:text-white shrink-0">
                  Pinned by {pinnedMessage.senderName}:
                </span>
                <span className="text-slate-600 dark:text-slate-300 truncate">
                  {pinnedMessage.body}
                </span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleTogglePin(pinnedMessage)}
                  className="text-xs font-semibold text-slate-500 hover:text-[#090D16] dark:hover:text-white shrink-0 cursor-pointer"
                >
                  Unpin
                </button>
              )}
            </div>
          )}

          {/* Message Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMessages ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading crew messages...</div>
            ) : visibleMessages.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="mt-2 text-sm font-semibold text-[#090D16] dark:text-white">
                  {searchQuery
                    ? 'No matching messages found'
                    : `Start the conversation in #${activeChannel?.name}`}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? 'Try a different keyword or athlete name.'
                    : 'Share a training check-in, PR, or rally your hub crew.'}
                </p>
              </div>
            ) : (
              visibleMessages.map((msg) => {
                const isSelf = msg.senderId === firebaseUser?.uid;
                const isEditing = editingMsgId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1 px-1">
                      <span className="font-semibold text-[#090D16] dark:text-slate-200">
                        {msg.senderName}
                      </span>
                      {msg.senderRole === 'Admin' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#FF4D1C]">Coach</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{formatTime(msg.createdAt)}</span>
                    </div>

                    <div
                      className={`group relative max-w-[85%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isSelf
                          ? 'bg-[#090D16] dark:bg-white text-white dark:text-[#090D16]'
                          : 'bg-slate-100 dark:bg-[#0B0E14] text-[#090D16] dark:text-slate-100 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {msg.attachmentType === 'workout' && msg.attachmentSummary && (
                        <div
                          className={`mb-2 rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                            isSelf
                              ? 'bg-white/10 dark:bg-black/10 text-slate-200 dark:text-slate-700'
                              : 'bg-white dark:bg-[#141923] border border-slate-200 dark:border-slate-800 text-[#090D16] dark:text-slate-200'
                          }`}
                        >
                          <Dumbbell className="h-3.5 w-3.5 text-[#FF4D1C] shrink-0" />
                          <span>{msg.attachmentSummary}</span>
                        </div>
                      )}

                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            maxLength={VALIDATION_BOUNDS.MESSAGE_BODY_MAX}
                            value={editingBody}
                            onChange={(e) => setEditingBody(e.target.value)}
                            className="w-full min-h-[36px] rounded-lg border border-slate-400 bg-white text-[#090D16] px-2.5 text-xs"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEditMessage(msg)}
                              className="text-xs font-semibold text-[#FF4D1C] cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMsgId(null)}
                              className="text-xs opacity-75 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      )}

                      <div className="mt-1.5 flex items-center justify-end gap-3 opacity-80">
                        <button
                          type="button"
                          onClick={() => handleQuoteMessage(msg)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline cursor-pointer"
                        >
                          <Reply className="h-3 w-3" />
                          <span>Reply</span>
                        </button>

                        {isSelf && !isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMsgId(msg.id);
                              setEditingBody(msg.body);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleTogglePin(msg)}
                            className="text-[11px] font-medium hover:underline cursor-pointer"
                          >
                            {msg.pinned ? 'Unpin' : 'Pin'}
                          </button>
                        )}

                        {(isAdmin || isSelf) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium hover:text-red-400 cursor-pointer"
                            aria-label="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14]"
          >
            {attachmentText && (
              <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141923] px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Dumbbell className="h-4 w-4 text-[#FF4D1C] shrink-0" />
                  <span className="truncate font-medium text-[#090D16] dark:text-white">
                    {attachmentText}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachmentText(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  aria-label="Remove workout attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {profile?.status === 'suspended' ? (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center py-2">
                Your messaging access is paused by club admin.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={VALIDATION_BOUNDS.MESSAGE_BODY_MAX}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder={`Message #${activeChannel?.name || 'crew'}...`}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#141923] px-3.5 text-sm text-[#090D16] dark:text-white focus:border-[#FF4D1C] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || (!draftBody.trim() && !attachmentText)}
                  className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-[#FF4D1C] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-[#E03A0C] disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  );
};
