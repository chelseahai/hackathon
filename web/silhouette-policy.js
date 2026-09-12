/* Approved design-intent policy. Geometry and physical fit remain separate. */
(function(global){'use strict';
var DEFAULT_POLICY={version:'silhouette-intent-v1',fitted_min_retained_shaping:.75,maximum_lower_chord_angle_degrees:45};
function value(p,camel,snake){return p[camel]!==undefined?p[camel]:p[snake];}
function evaluate(p,policy,geometryStatus){policy=policy||DEFAULT_POLICY;
  var waist=value(p,'waist','waist'),hip=value(p,'hip','hip'),ew=value(p,'waistEase','waist_ease'),eh=value(p,'hipEase','hip_ease'),f=value(p,'hemFullness','hem_fullness'),length=value(p,'dressLength','dress_length'),depth=value(p,'hipDepth','hip_depth'),rise=value(p,'sideHemRaise','side_hem_raise'),shares=value(p,'hemDistribution','hem_distribution');
  var threshold=policy.fitted_min_retained_shaping,tangent=Math.tan(policy.maximum_lower_chord_angle_degrees*Math.PI/180),available=hip+eh-waist-1,remaining=available-ew,retained=available>0?remaining/available:null,divider=(1-threshold)*available;
  var lower=length-depth,sideLower=lower-rise,side=Math.max(shares[0],shares[2]),princess=Math.max(shares[1],shares[3]),family=retained===null||retained<=0?null:ew<=divider?'fitted':'relaxed';
  var slopes=sideLower>0&&lower>0?[f*side/2/sideLower,f*princess/4/lower]:null,angle=slopes?Math.atan(Math.max.apply(null,slopes))*180/Math.PI:null,reasons=[];
  if(!family)reasons.push('Positive retained waist shaping is required');
  if(angle===null)reasons.push('Raised side hem must be below the hip');else if(Math.max.apply(null,slopes)>tangent+1e-12)reasons.push('Lower flare chord exceeds the approved 45 degree design limit');
  if(!(ew>=0&&ew<=12&&eh>=0&&eh<=12&&f>=0&&f<=80))reasons.push('Outside the current engine ease/fullness guards');
  var cap=sideLower>0?Math.min(80,side>0?2*sideLower*tangent/side:Infinity,princess>0?4*lower*tangent/princess:Infinity):null;
  var minLength=Math.max(depth+rise+f*side/(2*tangent),depth+f*princess/(4*tangent));
  var sideCap=f>0&&sideLower>0?2*sideLower*tangent/f:f===0&&sideLower>0?1:0,princessCap=f>0&&lower>0?4*lower*tangent/f:f===0&&sideLower>0?1:0;
  function interval(a,b,ca,cb){var x={minimum:a,maximum:b,minimum_inclusive:ca!==false,maximum_inclusive:cb!==false};x.empty=a==null||(b!=null&&(b<a||(b===a&&!(x.minimum_inclusive&&x.maximum_inclusive))));x.evidence='conditional design interval; geometry screening still required';return x;}
  var hipDivider=ew/(1-threshold)-hip+waist+1,hipPositive=ew-hip+waist+1;
  var intervals={fitted_waist_ease:interval(0,Math.min(12,divider)),relaxed_waist_ease:interval(Math.max(0,divider),Math.min(12,available),false,12<available),hem_fullness:interval(0,cap),dress_length:interval(minLength,null,minLength>depth+rise,false),fitted_hip_ease:interval(Math.max(0,hipDivider),12),relaxed_hip_ease:interval(Math.max(0,hipPositive),Math.min(12,hipDivider),0>hipPositive,12<hipDivider),side_allocation:interval(Math.max(0,1-princessCap*9/5),Math.min(1,sideCap*7/4)),front_allocation:interval(Math.max(0,1-sideCap*7/3,1-princessCap*7/4),Math.min(1,sideCap*9/4,princessCap*9/5))};
  if(sideLower<=0)intervals.hem_fullness.empty=true;
  return {policy_version:policy.version,family:family,retained_shaping:retained,maximum_chord_angle_degrees:angle,design_pass:!reasons.length,reasons:reasons,geometry_status:geometryStatus||null,usable_sample:!reasons.length&&geometryStatus==='pass',fit_status:'unverified',intervals:intervals};
}
function normalize(amount,interval){if(interval.empty||interval.maximum==null||interval.maximum<=interval.minimum)throw Error('A finite nonempty interval is required');if(amount<interval.minimum||amount>interval.maximum||(!interval.minimum_inclusive&&amount===interval.minimum)||(!interval.maximum_inclusive&&amount===interval.maximum))throw Error('Amount is outside the conditional interval');return (amount-interval.minimum)/(interval.maximum-interval.minimum);}
function denormalize(u,interval){if(!Number.isFinite(u)||u<0||u>1)throw Error('Normalized value must be between 0 and 1');if(interval.empty||interval.maximum==null||interval.maximum<=interval.minimum)throw Error('A finite nonempty interval is required');if((u===0&&!interval.minimum_inclusive)||(u===1&&!interval.maximum_inclusive))throw Error('This endpoint is open');return interval.minimum+u*(interval.maximum-interval.minimum);}
global.SilhouettePolicy={policy:DEFAULT_POLICY,evaluate:evaluate,normalize:normalize,denormalize:denormalize};
})(typeof window==='undefined'?globalThis:window);
