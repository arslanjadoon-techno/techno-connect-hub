import { useRef, useState } from "react";
import { getStoredUser } from "@/lib/api/client";
import { normalizePresence } from "./chatHealper";
import type { ChatNote } from "./ChatBodyPanels";

type ChatRecord = Record<string, any>;
type ChatMessageMap = Record<string, ChatRecord[]>;
type ChatState = ChatRecord | null;

export function useChatPageState() {
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
  const initialFetchStartedRef = useRef(false);
  const loadedChatHistoryRef = useRef<Set<string>>(new Set());
  const loadingChatHistoryRef = useRef<Set<string>>(new Set());
  const handledRealtimeMessageKeysRef = useRef<Set<string>>(new Set());
  const chatClearVersionsRef = useRef<Map<string, number>>(new Map());
  const realtimeStartedAtRef = useRef(Date.now());

  const [, setTab] = useState("conversations");
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [libraryMessages, setLibraryMessages] = useState<ChatRecord[]>([]);
  const [notes, setNotes] = useState<ChatNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [buddies, setBuddies] = useState<ChatRecord[]>([]);
  const [managedUsers, setManagedUsers] = useState<ChatRecord[]>([]);
  const [managedUsersLoading, setManagedUsersLoading] = useState(false);
  const [channels, setChannels] = useState<ChatRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedChat, setSelectedChat] = useState<ChatState>(null);
  const [messagesByChat, setMessagesByChat] = useState<ChatMessageMap>({});
  const [profileUser, setProfileUser] = useState<ChatState>(() => {
    const tokenUser = getStoredUser();
    if (tokenUser) return tokenUser;
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const currentUser = profileUser;
  const currentUserId = String(
    currentUser?.appUserId ||
      currentUser?.app_user_id ||
      currentUser?.userId ||
      currentUser?.user_id ||
      currentUser?.id ||
      "",
  );
  const currentUserEmail = String(
    currentUser?.email || currentUser?.email_id || currentUser?.mailid || "",
  ).toLowerCase();
  const [messageInfoVersions, setMessageInfoVersions] = useState<Record<string, number>>({});
  const [typingUsersByChat, setTypingUsersByChat] = useState<Record<string, ChatState>>({});
  const [messagePaginationByChat, setMessagePaginationByChat] = useState<Record<string, ChatRecord>>({});
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [mentionNotifications, setMentionNotifications] = useState(
    () => localStorage.getItem("chat_mention_notifications") !== "false",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupUserIds, setGroupUserIds] = useState<string[]>([]);
  const groupUserCacheRef = useRef<Map<string, ChatRecord>>(new Map());
  const [groupSearch, setGroupSearch] = useState("");
  const [groupError, setGroupError] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);
  const [addMemberUserIds, setAddMemberUserIds] = useState<string[]>([]);
  const [addMembersError, setAddMembersError] = useState("");
  const [addingMembers, setAddingMembers] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(
    () => normalizePresence(localStorage.getItem("chat_presence")),
  );
  const [statusSaving, setStatusSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeCall, setActiveCall] = useState<ChatState>(null);
  const [callMinimized, setCallMinimized] = useState(false);
  const [incomingCall, setIncomingCall] = useState<ChatState>(null);
  const [callStarting, setCallStarting] = useState(false);
  const [callResponding, setCallResponding] = useState(false);
  const [callError, setCallError] = useState("");
  const [callNotice, setCallNotice] = useState("");
  const [mutedChatIds, setMutedChatIds] = useState<string[]>([]);

  return {
    activeCall,
    addMemberUserIds,
    addMembersDialogOpen,
    addMembersError,
    addingMembers,
    avatarUploading,
    buddies,
    callError,
    callMinimized,
    callNotice,
    callResponding,
    callStarting,
    channels,
    chatBoxRef,
    chatClearVersionsRef,
    creatingGroup,
    currentStatus,
    currentUser,
    currentUserEmail,
    currentUserId,
    groupDialogOpen,
    groupError,
    groupSearch,
    groupTitle,
    groupUserCacheRef,
    groupUserIds,
    handledRealtimeMessageKeysRef,
    initialFetchStartedRef,
    incomingCall,
    libraryError,
    libraryLoading,
    libraryMessages,
    loadError,
    loadedChatHistoryRef,
    loading,
    loadingChatHistoryRef,
    loadingOlderMessages,
    managedUsers,
    managedUsersLoading,
    mentionNotifications,
    messageInfoVersions,
    messagePaginationByChat,
    messagesByChat,
    mutedChatIds,
    notes,
    notesError,
    notesLoading,
    profileUser,
    realtimeStartedAtRef,
    searchTerm,
    selectedChat,
    statusSaving,
    typingUsersByChat,
    setActiveCall,
    setAddMemberUserIds,
    setAddMembersDialogOpen,
    setAddMembersError,
    setAddingMembers,
    setAvatarUploading,
    setBuddies,
    setCallError,
    setCallMinimized,
    setCallNotice,
    setCallResponding,
    setCallStarting,
    setChannels,
    setCreatingGroup,
    setCurrentStatus,
    setGroupDialogOpen,
    setGroupError,
    setGroupSearch,
    setGroupTitle,
    setGroupUserIds,
    setIncomingCall,
    setLibraryError,
    setLibraryLoading,
    setLibraryMessages,
    setLoadError,
    setLoading,
    setLoadingOlderMessages,
    setManagedUsers,
    setManagedUsersLoading,
    setMentionNotifications,
    setMessageInfoVersions,
    setMessagePaginationByChat,
    setMessagesByChat,
    setMutedChatIds,
    setNotes,
    setNotesError,
    setNotesLoading,
    setProfileUser,
    setSearchTerm,
    setSelectedChat,
    setStatusSaving,
    setTab,
    setTypingUsersByChat,
  };
}

