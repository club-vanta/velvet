/** The actions that open a dialog for one guest. */
export type GuestDialogKind = "edit" | "link" | "unlink" | "ban";

/** Every action on one guest; unvanting runs at once, without a dialog. */
export type GuestAction = GuestDialogKind | "unban";
