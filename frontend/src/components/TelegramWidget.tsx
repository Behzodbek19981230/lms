import React, { useState, useRef, useEffect } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramWidgetProps {
  botName: string;
  onAuth: (user: TelegramUser) => void;
  size?: 'large' | 'medium' | 'small';
  requestAccess?: 'write';
}

const TelegramWidget: React.FC<TelegramWidgetProps> = ({
  botName,
  onAuth,
  size = 'large',
  requestAccess = 'write'
}) => {
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = '';

    // Create iframe for Telegram widget
    const widgetUrl = new URL('https://oauth.telegram.org/embed/');
    const params = new URLSearchParams({
      origin: window.location.origin,
      size,
      userpic: 'false',
      radius: '4',
    });

    widgetUrl.search = params.toString();
    widgetUrl.pathname = `/embed/${botName}`;

    const iframe = document.createElement('iframe');
    iframe.src = widgetUrl.toString();
    iframe.width = size === 'large' ? '200' : size === 'medium' ? '180' : '150';
    iframe.height = '34';
    iframe.frameBorder = '0';
    iframe.scrolling = 'no';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '4px';

    // Handle message from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://oauth.telegram.org') return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'auth_user') {
          onAuth(data.user);
        }
      } catch (error) {
        console.error('Error parsing Telegram widget message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    containerRef.current.appendChild(iframe);

    iframe.onload = () => setLoaded(true);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [botName, size, requestAccess, onAuth]);

  return (
    <div 
      ref={containerRef} 
      className="telegram-widget-container flex justify-center"
      style={{ minHeight: '34px' }}
    >
      {!loaded && (
        <div className="animate-pulse bg-blue-100 rounded" style={{ width: '200px', height: '34px' }}>
          <div className="flex items-center justify-center h-full text-xs text-blue-600">
            Telegram yuklanmoqda...
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramWidget;
