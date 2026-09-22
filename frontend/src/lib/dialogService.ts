export interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'primary';
  icon?: 'trash' | 'alert' | 'info' | 'help' | 'check';
}

export type DialogResolver = (value: boolean) => void;

export interface ActiveDialogState extends DialogOptions {
  id: string;
  resolve: DialogResolver;
}

/**
 * Dispatches an in-app confirmation modal dialog that resolves to true (confirmed) or false (cancelled).
 * Drop-in replacement for window.confirm().
 */
export const confirmAction = (options: DialogOptions | string): Promise<boolean> => {
  const opts: DialogOptions = typeof options === 'string' ? { message: options } : options;
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(
      new CustomEvent('siteops_show_confirm_dialog', {
        detail: {
          ...opts,
          id: `dlg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          resolve,
        },
      })
    );
  });
};

/**
 * Dispatches an in-app alert modal dialog.
 * Drop-in replacement for window.alert().
 */
export const alertAction = (
  message: string,
  title: string = 'Notification',
  variant: 'info' | 'warning' | 'danger' | 'primary' = 'info'
): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(
      new CustomEvent('siteops_show_confirm_dialog', {
        detail: {
          title,
          message,
          confirmText: 'OK',
          cancelText: '', // Empty cancel text hides Cancel button
          variant,
          id: `dlg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          resolve,
        },
      })
    );
  });
};

/**
 * Dedicated confirmation prompt for user Sign Out.
 */
export const confirmSignOut = async (): Promise<boolean> => {
  return confirmAction({
    title: 'Sign Out',
    message: 'Are you sure you want to sign out of your account?',
    confirmText: 'Sign Out',
    cancelText: 'Stay Logged In',
    variant: 'danger',
    icon: 'alert'
  });
};

// ----------------------------------------------------
// Dirty Form State Tracking & Navigation Guard
// ----------------------------------------------------
let formDirtyState = false;
let formDirtyDescription = 'entered data';

export const setFormDirty = (dirty: boolean, description: string = 'entered data'): void => {
  formDirtyState = dirty;
  formDirtyDescription = description;
};

export const getIsFormDirty = (): boolean => formDirtyState;

export const clearFormDirty = (): void => {
  formDirtyState = false;
};

/**
 * Checks whether an active form has unsaved dirty data.
 * If dirty, prompts the user: "Are you sure you want to leave this page? Your entered data will be lost."
 * Returns true if safe to navigate, false if cancelled.
 */
export const confirmNavigationIfDirty = async (
  customMessage?: string
): Promise<boolean> => {
  if (!formDirtyState) return true;

  const confirmed = await confirmAction({
    title: 'Leave Page?',
    message: customMessage || 'Are you sure you want to leave this page?\nYour entered data will be lost.',
    confirmText: 'Leave Page',
    cancelText: 'Stay on Page',
    variant: 'warning',
    icon: 'alert'
  });

  if (confirmed) {
    formDirtyState = false;
    return true;
  }
  return false;
};

/**
 * Prompts user before submitting or saving any form with entered/updated data.
 */
export const confirmFormSubmit = async (
  actionName: string = 'submit this form',
  title: string = 'Confirm Submission',
  variant: 'primary' | 'danger' | 'warning' | 'info' = 'primary'
): Promise<boolean> => {
  return confirmAction({
    title,
    message: `Are you sure you want to ${actionName}?`,
    confirmText: 'Confirm & Save',
    cancelText: 'Review Form',
    variant,
    icon: variant === 'danger' ? 'trash' : variant === 'warning' ? 'alert' : 'info'
  });
};
