// Menampilkan toast notifikasi global + indikator status koneksi Realtime.
import { useUiStore } from '../lib/uiStore';
import './NotificationHost.css';

const NotificationHost = () => {
  const realtime = useUiStore((s) => s.realtime);

  return (
    <>


      {realtime === 'disconnected' && (
        <div className="realtime-pill disconnected">
          Realtime terputus — menyambung ulang…
        </div>
      )}
    </>
  );
};

export default NotificationHost;
