import { useEffect } from 'react';

declare global {
  interface Window {
    smartsupp: any;
    smartsuppLoader: any;
  }
}

export default function SmartSupp() {
  useEffect(() => {
    // Add Smartsupp to your website
    const loadSmartsupp = () => {
      // Create script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = `
        var _smartsupp = _smartsupp || {};
        _smartsupp.key = 'ADD_YOUR_SMARTSUPP_KEY_HERE'; // Replace with your own key from Smartsupp dashboard
        window.smartsupp||(function(d) {
          var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
          s=d.createElement('script');c=d.getElementsByTagName('script')[0];
          s.type='text/javascript';s.charset='utf-8';s.async=true;
          s.src='https://www.smartsuppchat.com/loader.js?';c.parentNode.insertBefore(s,c);
        })(document);
      `;
      
      // Add script to page
      document.body.appendChild(script);
      
      // Configure Smartsupp
      window.smartsupp('theme:colors', { 
        primary: '#3b82f6', // SkyBooker primary blue color
        banner: '#3b82f6', 
        bubbleClient: '#3b82f6'
      });
      
      window.smartsupp('name', 'SkyBooker Support');
      window.smartsupp('variables', {
        appName: { label: 'App Name', value: 'SkyBooker Flight Booking' }
      });
    };

    // Ensure we only load it once
    if (typeof window.smartsupp === 'undefined') {
      loadSmartsupp();
    }
    
    return () => {
      // Cleanup if needed - not usually necessary for Smartsupp
    };
  }, []);

  return null; // This component doesn't render anything
}