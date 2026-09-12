// Adapted from gemini-fitting-tool/gemini_fitting_tool.py.
const {imagePart,AnalysisError}=require('./analysis.cjs');
const PROMPT='Generate a full-body photographic fitting picture on a white studio background with natural soft lighting. The real person in INPUT 1 is wearing the dress in INPUT 2 CLO renders. Preserve the person’s identity, facial features, skin tone and body proportions. The CLO renders specify both garment style AND fit: preserve princess seam placement, neckline, armholes, bust contour, waist shaping, ease, hem length and skirt fullness. Keep the fabric and drape faithful to the renders. Do not copy the mannequin or the person’s original clothing. Do not slim or reshape the person. Produce one clean photograph, without a collage, labels or text.';
async function generate(body,{apiKey=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY,model=process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image',fetchImpl=fetch,signal}={}){
  if(!body||typeof body!=='object')throw new AnalysisError('Invalid fitting request.');
  const parts=[];
  for(const [field,label] of [['humanImages','INPUT 1: real person; identity and body references'],['cloImages','INPUT 2: CLO garment; design and fit references']]){
    if(!Array.isArray(body[field])||body[field].length<1||body[field].length>3)throw new AnalysisError('Choose 1–3 person photos and 1–3 CLO renders.');
    parts.push({text:label});body[field].forEach(img=>parts.push(imagePart(img)));
  }
  if(!['front','side','back'].includes(body.view))throw new AnalysisError('Choose a front, side or back view.');
  if(typeof body.prompt!=='string'||body.prompt.length>4000)throw new AnalysisError('Keep the generation instructions under 4,000 characters.');
  const key=typeof body.apiKey==='string'&&body.apiKey.trim()?body.apiKey.trim():apiKey;
  if(!key)throw new AnalysisError('Enter a Gemini API key in Step 4 connection settings, or configure a server key.',503);
  if(!/^[\w.-]+$/.test(model))throw new AnalysisError('Invalid server image model.',500);
  parts.push({text:PROMPT+'\nOutput camera view: '+body.view+'.\nAdditional instructions: '+body.prompt});
  let response,payload;
  try{response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts}],generationConfig:{responseModalities:['TEXT','IMAGE']}}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(180000)]):AbortSignal.timeout(180000)});}catch{throw new AnalysisError('Generation was cancelled, timed out, or could not reach Gemini. Try again.',502);}
  if(!response.ok)throw new AnalysisError(response.status===429?'Gemini quota or rate limit reached. Check your plan or try later.':response.status===404?'The image model is unavailable. Check GEMINI_IMAGE_MODEL on the server.':'Gemini rejected generation. Check your API key and image-model access, then try again.',response.status===429?429:502);
  try{payload=await response.json();}catch{throw new AnalysisError('Gemini returned an unreadable response.',502);}
  const output=payload.candidates?.[0]?.content?.parts||[];
  const images=output.filter(p=>!p.thought&&p.inlineData&&/^image\/(png|jpeg|webp)$/.test(p.inlineData.mimeType)).map(p=>'data:'+p.inlineData.mimeType+';base64,'+p.inlineData.data);
  if(!images.length)throw new AnalysisError('Gemini returned no image. Try clearer references or revised instructions; the request may have been blocked.',422);
  return {success:true,source:'gemini-live',model,images,text:output.filter(p=>p.text&&!p.thought).map(p=>p.text).join('\n'),view:body.view};
}
module.exports={generate,PROMPT};
