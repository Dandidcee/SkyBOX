// Menampilkan toast notifikasi global + indikator status koneksi Realtime.
import { useUiStore } from '../lib/uiStore';
import './NotificationHost.css';

const NotificationHost = () => {
  const notifications = useUiStore((s) => s.notifications);
  const dismiss = useUiStore((s) => s.dismiss);
  const realtime = useUiStore((s) => s.realtime);

  return (
    <>
      <div className="notif-host">
        {notifications.map((n) => (
          <div key={n.id} className={`notif-toast ${n.kind}`} onClick={() => dismiss(n.id)}>
            {n.text}
          </div>
        ))}
      </div>

      {realtime === 'disconnected' && (
        <div className="realtime-pill disconnected">
          Realtime terputus — menyambung ulang…
        </div>
      )}
    </>
  );
};

export default NotificationHost;
