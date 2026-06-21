export interface PortalNotification {
  id: string;
  type: 'timetable_created' | 'timetable_updated' | 'timetable_deleted' | 'period_bell' | 'fee_due' | 'attendance_alert';
  title: string;
  message: string;
  timestamp: string;
  teacherId?: string; // Target specific teacher
  classId?: string;   // Target specific class (for students)
  role?: 'all' | 'teacher' | 'student' | 'principal';
  isUnread?: boolean;
}

export const getNotifications = (): PortalNotification[] => {
  try {
    const saved = localStorage.getItem('acadamis_notifications');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

export const saveNotifications = (notifications: PortalNotification[]) => {
  try {
    localStorage.setItem('acadamis_notifications', JSON.stringify(notifications));
  } catch (e) {
    console.error(e);
  }
};

export const addNotification = (notif: Omit<PortalNotification, 'id' | 'timestamp' | 'isUnread'>): PortalNotification => {
  const current = getNotifications();
  const newNotif: PortalNotification = {
    ...notif,
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleString(),
    isUnread: true,
  };
  saveNotifications([newNotif, ...current].slice(0, 50)); // store last 50
  
  // Custom event to notify other open tabs or parts of the app instantly
  window.dispatchEvent(new Event('acadamis_new_notification'));
  return newNotif;
};
