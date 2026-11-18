/** Meta Pixel base code for the root layout's <head>: starts loading
 *  fbevents.js with the HTML instead of after hydration, and sends the first
 *  PageView. Renders nothing unless NEXT_PUBLIC_META_PIXEL_ID is set.
 *  Later PageViews (client-side navigations) are sent by <MetaPixel />. */
export function MetaPixelHead() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId || !/^\d+$/.test(pixelId)) return null;

  const code = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');`;

  return (
    <>
      <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="anonymous" />
      <script id="meta-pixel-init" dangerouslySetInnerHTML={{ __html: code }} />
    </>
  );
}
