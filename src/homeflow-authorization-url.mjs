// Validate every browser-visible OAuth field before iOS PWA leaves its WebView.
// This never stores a code, verifier, token or cookie in Safari navigation.
export function validateStudyHomeflowAuthorizationUrl(raw,expectedState,appOrigin){
 const fail=()=>{throw new Error('HomeFlow 授权地址校验失败')};
 if(typeof raw!=='string'||typeof appOrigin!=='string'||!/^https:\/\//.test(raw)||
  !/^[a-f0-9]{64}$/.test(expectedState||''))fail();
 let url,origin,callback;
 try{
  url=new URL(raw);origin=new URL(appOrigin);
  callback=new URL(url.searchParams.get('redirect_uri')||'');
 }catch{fail()}
 if(origin.protocol!=='https:'||origin.origin!==appOrigin||
  url.protocol!=='https:'||url.username||url.password||
  url.hash||url.pathname!=='/authorize'||
  url.searchParams.get('response_type')!=='code'||
  url.searchParams.get('client_id')!=='it-study-platform'||
  url.searchParams.get('code_challenge_method')!=='S256'||
  !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code_challenge')||'')||
  !/^[a-f0-9]{64}$/.test(url.searchParams.get('nonce')||'')||
  url.searchParams.get('state')!==expectedState||
  callback.href!==appOrigin+'/api/homeflow-sso/callback'||
  url.searchParams.size!==7)fail();
 return url;
}
