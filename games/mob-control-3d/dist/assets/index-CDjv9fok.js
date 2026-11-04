var Ef=Object.defineProperty;var Cf=(i,t,e)=>t in i?Ef(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e;var B=(i,t,e)=>Cf(i,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function e(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(s){if(s.ep)return;s.ep=!0;const a=e(s);fetch(s.href,a)}})();/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const ec="170",Af=0,Uc=1,Rf=2,nc=1,Pf=2,ii=3,Di=0,sn=1,Ae=2,li=0,Ds=1,ka=2,zc=3,Fc=4,kf=5,Xi=100,If=101,Lf=102,Df=103,Bf=104,Nf=200,Uf=201,zf=202,Ff=203,tl=204,el=205,Of=206,Hf=207,Gf=208,Vf=209,$f=210,Wf=211,Xf=212,qf=213,Kf=214,nl=0,il=1,sl=2,Fs=3,al=4,ol=5,rl=6,ll=7,fu=0,Yf=1,Zf=2,Ai=0,pu=1,mu=2,gu=3,ic=4,jf=5,vu=6,xu=7,_u=300,Os=301,Hs=302,cl=303,hl=304,$o=306,es=1e3,Ke=1001,dl=1002,mn=1003,Jf=1004,Xa=1005,Hn=1006,Qo=1007,Yi=1008,ui=1009,Mu=1010,yu=1011,Ia=1012,sc=1013,ns=1014,Gn=1015,ci=1016,ac=1017,oc=1018,Gs=1020,Su=35902,bu=1021,wu=1022,Pn=1023,Tu=1024,Eu=1025,Bs=1026,Vs=1027,rc=1028,lc=1029,Cu=1030,cc=1031,hc=1033,To=33776,Eo=33777,Co=33778,Ao=33779,ul=35840,fl=35841,pl=35842,ml=35843,gl=36196,vl=37492,xl=37496,_l=37808,Ml=37809,yl=37810,Sl=37811,bl=37812,wl=37813,Tl=37814,El=37815,Cl=37816,Al=37817,Rl=37818,Pl=37819,kl=37820,Il=37821,Ro=36492,Ll=36494,Dl=36495,Au=36283,Bl=36284,Nl=36285,Ul=36286,Qf=3200,tp=3201,Ru=0,ep=1,Ci="",qe="srgb",Zs="srgb-linear",Wo="linear",ye="srgb",ds=7680,Oc=519,np=512,ip=513,sp=514,Pu=515,ap=516,op=517,rp=518,lp=519,Hc=35044,rn=35048,Gc="300 es",ai=2e3,Io=2001;class js{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const s=this._listeners[t];if(s!==void 0){const a=s.indexOf(e);a!==-1&&s.splice(a,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const s=n.slice(0);for(let a=0,o=s.length;a<o;a++)s[a].call(this,t);t.target=null}}}const Ze=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Vc=1234567;const Ma=Math.PI/180,La=180/Math.PI;function rs(){const i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ze[i&255]+Ze[i>>8&255]+Ze[i>>16&255]+Ze[i>>24&255]+"-"+Ze[t&255]+Ze[t>>8&255]+"-"+Ze[t>>16&15|64]+Ze[t>>24&255]+"-"+Ze[e&63|128]+Ze[e>>8&255]+"-"+Ze[e>>16&255]+Ze[e>>24&255]+Ze[n&255]+Ze[n>>8&255]+Ze[n>>16&255]+Ze[n>>24&255]).toLowerCase()}function $e(i,t,e){return Math.max(t,Math.min(e,i))}function dc(i,t){return(i%t+t)%t}function cp(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function hp(i,t,e){return i!==t?(e-i)/(t-i):0}function ya(i,t,e){return(1-e)*i+e*t}function dp(i,t,e,n){return ya(i,t,1-Math.exp(-e*n))}function up(i,t=1){return t-Math.abs(dc(i,t*2)-t)}function fp(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function pp(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function mp(i,t){return i+Math.floor(Math.random()*(t-i+1))}function gp(i,t){return i+Math.random()*(t-i)}function vp(i){return i*(.5-Math.random())}function xp(i){i!==void 0&&(Vc=i);let t=Vc+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function _p(i){return i*Ma}function Mp(i){return i*La}function yp(i){return(i&i-1)===0&&i!==0}function Sp(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function bp(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function wp(i,t,e,n,s){const a=Math.cos,o=Math.sin,r=a(e/2),l=o(e/2),c=a((t+n)/2),d=o((t+n)/2),u=a((t-n)/2),f=o((t-n)/2),m=a((n-t)/2),p=o((n-t)/2);switch(s){case"XYX":i.set(r*d,l*u,l*f,r*c);break;case"YZY":i.set(l*f,r*d,l*u,r*c);break;case"ZXZ":i.set(l*u,l*f,r*d,r*c);break;case"XZX":i.set(r*d,l*p,l*m,r*c);break;case"YXY":i.set(l*m,r*d,l*p,r*c);break;case"ZYZ":i.set(l*p,l*m,r*d,r*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Ps(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function tn(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const jt={DEG2RAD:Ma,RAD2DEG:La,generateUUID:rs,clamp:$e,euclideanModulo:dc,mapLinear:cp,inverseLerp:hp,lerp:ya,damp:dp,pingpong:up,smoothstep:fp,smootherstep:pp,randInt:mp,randFloat:gp,randFloatSpread:vp,seededRandom:xp,degToRad:_p,radToDeg:Mp,isPowerOfTwo:yp,ceilPowerOfTwo:Sp,floorPowerOfTwo:bp,setQuaternionFromProperEuler:wp,normalize:tn,denormalize:Ps};class ft{constructor(t=0,e=0){ft.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos($e(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),s=Math.sin(e),a=this.x-t.x,o=this.y-t.y;return this.x=a*n-o*s+t.x,this.y=a*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class se{constructor(t,e,n,s,a,o,r,l,c){se.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,a,o,r,l,c)}set(t,e,n,s,a,o,r,l,c){const d=this.elements;return d[0]=t,d[1]=s,d[2]=r,d[3]=e,d[4]=a,d[5]=l,d[6]=n,d[7]=o,d[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,a=this.elements,o=n[0],r=n[3],l=n[6],c=n[1],d=n[4],u=n[7],f=n[2],m=n[5],p=n[8],S=s[0],g=s[3],h=s[6],b=s[1],w=s[4],y=s[7],C=s[2],v=s[5],T=s[8];return a[0]=o*S+r*b+l*C,a[3]=o*g+r*w+l*v,a[6]=o*h+r*y+l*T,a[1]=c*S+d*b+u*C,a[4]=c*g+d*w+u*v,a[7]=c*h+d*y+u*T,a[2]=f*S+m*b+p*C,a[5]=f*g+m*w+p*v,a[8]=f*h+m*y+p*T,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],s=t[2],a=t[3],o=t[4],r=t[5],l=t[6],c=t[7],d=t[8];return e*o*d-e*r*c-n*a*d+n*r*l+s*a*c-s*o*l}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],a=t[3],o=t[4],r=t[5],l=t[6],c=t[7],d=t[8],u=d*o-r*c,f=r*l-d*a,m=c*a-o*l,p=e*u+n*f+s*m;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);const S=1/p;return t[0]=u*S,t[1]=(s*c-d*n)*S,t[2]=(r*n-s*o)*S,t[3]=f*S,t[4]=(d*e-s*l)*S,t[5]=(s*a-r*e)*S,t[6]=m*S,t[7]=(n*l-c*e)*S,t[8]=(o*e-n*a)*S,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,a,o,r){const l=Math.cos(a),c=Math.sin(a);return this.set(n*l,n*c,-n*(l*o+c*r)+o+t,-s*c,s*l,-s*(-c*o+l*r)+r+e,0,0,1),this}scale(t,e){return this.premultiply(tr.makeScale(t,e)),this}rotate(t){return this.premultiply(tr.makeRotation(-t)),this}translate(t,e){return this.premultiply(tr.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const tr=new se;function ku(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function Lo(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Tp(){const i=Lo("canvas");return i.style.display="block",i}const $c={};function ga(i){i in $c||($c[i]=!0,console.warn(i))}function Ep(i,t,e){return new Promise(function(n,s){function a(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(a,e);break;default:n()}}setTimeout(a,e)})}function Cp(i){const t=i.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function Ap(i){const t=i.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const de={enabled:!0,workingColorSpace:Zs,spaces:{},convert:function(i,t,e){return this.enabled===!1||t===e||!t||!e||(this.spaces[t].transfer===ye&&(i.r=hi(i.r),i.g=hi(i.g),i.b=hi(i.b)),this.spaces[t].primaries!==this.spaces[e].primaries&&(i.applyMatrix3(this.spaces[t].toXYZ),i.applyMatrix3(this.spaces[e].fromXYZ)),this.spaces[e].transfer===ye&&(i.r=Ns(i.r),i.g=Ns(i.g),i.b=Ns(i.b))),i},fromWorkingColorSpace:function(i,t){return this.convert(i,this.workingColorSpace,t)},toWorkingColorSpace:function(i,t){return this.convert(i,t,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Ci?Wo:this.spaces[i].transfer},getLuminanceCoefficients:function(i,t=this.workingColorSpace){return i.fromArray(this.spaces[t].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,t,e){return i.copy(this.spaces[t].toXYZ).multiply(this.spaces[e].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace}};function hi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Ns(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}const Wc=[.64,.33,.3,.6,.15,.06],Xc=[.2126,.7152,.0722],qc=[.3127,.329],Kc=new se().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Yc=new se().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);de.define({[Zs]:{primaries:Wc,whitePoint:qc,transfer:Wo,toXYZ:Kc,fromXYZ:Yc,luminanceCoefficients:Xc,workingColorSpaceConfig:{unpackColorSpace:qe},outputColorSpaceConfig:{drawingBufferColorSpace:qe}},[qe]:{primaries:Wc,whitePoint:qc,transfer:ye,toXYZ:Kc,fromXYZ:Yc,luminanceCoefficients:Xc,outputColorSpaceConfig:{drawingBufferColorSpace:qe}}});let us;class Rp{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{us===void 0&&(us=Lo("canvas")),us.width=t.width,us.height=t.height;const n=us.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=us}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Lo("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const s=n.getImageData(0,0,t.width,t.height),a=s.data;for(let o=0;o<a.length;o++)a[o]=hi(a[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(hi(e[n]/255)*255):e[n]=hi(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Pp=0;class Iu{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Pp++}),this.uuid=rs(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let a;if(Array.isArray(s)){a=[];for(let o=0,r=s.length;o<r;o++)s[o].isDataTexture?a.push(er(s[o].image)):a.push(er(s[o]))}else a=er(s);n.url=a}return e||(t.images[this.uuid]=n),n}}function er(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Rp.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let kp=0;class Je extends js{constructor(t=Je.DEFAULT_IMAGE,e=Je.DEFAULT_MAPPING,n=Ke,s=Ke,a=Hn,o=Yi,r=Pn,l=ui,c=Je.DEFAULT_ANISOTROPY,d=Ci){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:kp++}),this.uuid=rs(),this.name="",this.source=new Iu(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=a,this.minFilter=o,this.anisotropy=c,this.format=r,this.internalFormat=null,this.type=l,this.offset=new ft(0,0),this.repeat=new ft(1,1),this.center=new ft(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new se,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=d,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==_u)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case es:t.x=t.x-Math.floor(t.x);break;case Ke:t.x=t.x<0?0:1;break;case dl:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case es:t.y=t.y-Math.floor(t.y);break;case Ke:t.y=t.y<0?0:1;break;case dl:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Je.DEFAULT_IMAGE=null;Je.DEFAULT_MAPPING=_u;Je.DEFAULT_ANISOTROPY=1;class be{constructor(t=0,e=0,n=0,s=1){be.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,a=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*a,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*a,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*a,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*a,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,a;const l=t.elements,c=l[0],d=l[4],u=l[8],f=l[1],m=l[5],p=l[9],S=l[2],g=l[6],h=l[10];if(Math.abs(d-f)<.01&&Math.abs(u-S)<.01&&Math.abs(p-g)<.01){if(Math.abs(d+f)<.1&&Math.abs(u+S)<.1&&Math.abs(p+g)<.1&&Math.abs(c+m+h-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const w=(c+1)/2,y=(m+1)/2,C=(h+1)/2,v=(d+f)/4,T=(u+S)/4,P=(p+g)/4;return w>y&&w>C?w<.01?(n=0,s=.707106781,a=.707106781):(n=Math.sqrt(w),s=v/n,a=T/n):y>C?y<.01?(n=.707106781,s=0,a=.707106781):(s=Math.sqrt(y),n=v/s,a=P/s):C<.01?(n=.707106781,s=.707106781,a=0):(a=Math.sqrt(C),n=T/a,s=P/a),this.set(n,s,a,e),this}let b=Math.sqrt((g-p)*(g-p)+(u-S)*(u-S)+(f-d)*(f-d));return Math.abs(b)<.001&&(b=1),this.x=(g-p)/b,this.y=(u-S)/b,this.z=(f-d)/b,this.w=Math.acos((c+m+h-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Ip extends js{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new be(0,0,t,e),this.scissorTest=!1,this.viewport=new be(0,0,t,e);const s={width:t,height:e,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Hn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const a=new Je(s,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);a.flipY=!1,a.generateMipmaps=n.generateMipmaps,a.internalFormat=n.internalFormat,this.textures=[];const o=n.count;for(let r=0;r<o;r++)this.textures[r]=a.clone(),this.textures[r].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,a=this.textures.length;s<a;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,s=t.textures.length;n<s;n++)this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new Iu(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class kn extends Ip{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class Lu extends Je{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=mn,this.minFilter=mn,this.wrapR=Ke,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Lp extends Je{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=mn,this.minFilter=mn,this.wrapR=Ke,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ha{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,a,o,r){let l=n[s+0],c=n[s+1],d=n[s+2],u=n[s+3];const f=a[o+0],m=a[o+1],p=a[o+2],S=a[o+3];if(r===0){t[e+0]=l,t[e+1]=c,t[e+2]=d,t[e+3]=u;return}if(r===1){t[e+0]=f,t[e+1]=m,t[e+2]=p,t[e+3]=S;return}if(u!==S||l!==f||c!==m||d!==p){let g=1-r;const h=l*f+c*m+d*p+u*S,b=h>=0?1:-1,w=1-h*h;if(w>Number.EPSILON){const C=Math.sqrt(w),v=Math.atan2(C,h*b);g=Math.sin(g*v)/C,r=Math.sin(r*v)/C}const y=r*b;if(l=l*g+f*y,c=c*g+m*y,d=d*g+p*y,u=u*g+S*y,g===1-r){const C=1/Math.sqrt(l*l+c*c+d*d+u*u);l*=C,c*=C,d*=C,u*=C}}t[e]=l,t[e+1]=c,t[e+2]=d,t[e+3]=u}static multiplyQuaternionsFlat(t,e,n,s,a,o){const r=n[s],l=n[s+1],c=n[s+2],d=n[s+3],u=a[o],f=a[o+1],m=a[o+2],p=a[o+3];return t[e]=r*p+d*u+l*m-c*f,t[e+1]=l*p+d*f+c*u-r*m,t[e+2]=c*p+d*m+r*f-l*u,t[e+3]=d*p-r*u-l*f-c*m,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,s=t._y,a=t._z,o=t._order,r=Math.cos,l=Math.sin,c=r(n/2),d=r(s/2),u=r(a/2),f=l(n/2),m=l(s/2),p=l(a/2);switch(o){case"XYZ":this._x=f*d*u+c*m*p,this._y=c*m*u-f*d*p,this._z=c*d*p+f*m*u,this._w=c*d*u-f*m*p;break;case"YXZ":this._x=f*d*u+c*m*p,this._y=c*m*u-f*d*p,this._z=c*d*p-f*m*u,this._w=c*d*u+f*m*p;break;case"ZXY":this._x=f*d*u-c*m*p,this._y=c*m*u+f*d*p,this._z=c*d*p+f*m*u,this._w=c*d*u-f*m*p;break;case"ZYX":this._x=f*d*u-c*m*p,this._y=c*m*u+f*d*p,this._z=c*d*p-f*m*u,this._w=c*d*u+f*m*p;break;case"YZX":this._x=f*d*u+c*m*p,this._y=c*m*u+f*d*p,this._z=c*d*p-f*m*u,this._w=c*d*u-f*m*p;break;case"XZY":this._x=f*d*u-c*m*p,this._y=c*m*u-f*d*p,this._z=c*d*p+f*m*u,this._w=c*d*u+f*m*p;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],s=e[4],a=e[8],o=e[1],r=e[5],l=e[9],c=e[2],d=e[6],u=e[10],f=n+r+u;if(f>0){const m=.5/Math.sqrt(f+1);this._w=.25/m,this._x=(d-l)*m,this._y=(a-c)*m,this._z=(o-s)*m}else if(n>r&&n>u){const m=2*Math.sqrt(1+n-r-u);this._w=(d-l)/m,this._x=.25*m,this._y=(s+o)/m,this._z=(a+c)/m}else if(r>u){const m=2*Math.sqrt(1+r-n-u);this._w=(a-c)/m,this._x=(s+o)/m,this._y=.25*m,this._z=(l+d)/m}else{const m=2*Math.sqrt(1+u-n-r);this._w=(o-s)/m,this._x=(a+c)/m,this._y=(l+d)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs($e(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,s=t._y,a=t._z,o=t._w,r=e._x,l=e._y,c=e._z,d=e._w;return this._x=n*d+o*r+s*c-a*l,this._y=s*d+o*l+a*r-n*c,this._z=a*d+o*c+n*l-s*r,this._w=o*d-n*r-s*l-a*c,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,s=this._y,a=this._z,o=this._w;let r=o*t._w+n*t._x+s*t._y+a*t._z;if(r<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,r=-r):this.copy(t),r>=1)return this._w=o,this._x=n,this._y=s,this._z=a,this;const l=1-r*r;if(l<=Number.EPSILON){const m=1-e;return this._w=m*o+e*this._w,this._x=m*n+e*this._x,this._y=m*s+e*this._y,this._z=m*a+e*this._z,this.normalize(),this}const c=Math.sqrt(l),d=Math.atan2(c,r),u=Math.sin((1-e)*d)/c,f=Math.sin(e*d)/c;return this._w=o*u+this._w*f,this._x=n*u+this._x*f,this._y=s*u+this._y*f,this._z=a*u+this._z*f,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),a=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),a*Math.sin(e),a*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class G{constructor(t=0,e=0,n=0){G.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Zc.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Zc.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,s=this.z,a=t.elements;return this.x=a[0]*e+a[3]*n+a[6]*s,this.y=a[1]*e+a[4]*n+a[7]*s,this.z=a[2]*e+a[5]*n+a[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,a=t.elements,o=1/(a[3]*e+a[7]*n+a[11]*s+a[15]);return this.x=(a[0]*e+a[4]*n+a[8]*s+a[12])*o,this.y=(a[1]*e+a[5]*n+a[9]*s+a[13])*o,this.z=(a[2]*e+a[6]*n+a[10]*s+a[14])*o,this}applyQuaternion(t){const e=this.x,n=this.y,s=this.z,a=t.x,o=t.y,r=t.z,l=t.w,c=2*(o*s-r*n),d=2*(r*e-a*s),u=2*(a*n-o*e);return this.x=e+l*c+o*u-r*d,this.y=n+l*d+r*c-a*u,this.z=s+l*u+a*d-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,s=this.z,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*s,this.y=a[1]*e+a[5]*n+a[9]*s,this.z=a[2]*e+a[6]*n+a[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,s=t.y,a=t.z,o=e.x,r=e.y,l=e.z;return this.x=s*l-a*r,this.y=a*o-n*l,this.z=n*r-s*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return nr.copy(this).projectOnVector(t),this.sub(nr)}reflect(t){return this.sub(nr.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos($e(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const nr=new G,Zc=new Ha;class ls{constructor(t=new G(1/0,1/0,1/0),e=new G(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(wn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(wn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=wn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const a=n.getAttribute("position");if(e===!0&&a!==void 0&&t.isInstancedMesh!==!0)for(let o=0,r=a.count;o<r;o++)t.isMesh===!0?t.getVertexPosition(o,wn):wn.fromBufferAttribute(a,o),wn.applyMatrix4(t.matrixWorld),this.expandByPoint(wn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),qa.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),qa.copy(n.boundingBox)),qa.applyMatrix4(t.matrixWorld),this.union(qa)}const s=t.children;for(let a=0,o=s.length;a<o;a++)this.expandByObject(s[a],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,wn),wn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(aa),Ka.subVectors(this.max,aa),fs.subVectors(t.a,aa),ps.subVectors(t.b,aa),ms.subVectors(t.c,aa),gi.subVectors(ps,fs),vi.subVectors(ms,ps),Ui.subVectors(fs,ms);let e=[0,-gi.z,gi.y,0,-vi.z,vi.y,0,-Ui.z,Ui.y,gi.z,0,-gi.x,vi.z,0,-vi.x,Ui.z,0,-Ui.x,-gi.y,gi.x,0,-vi.y,vi.x,0,-Ui.y,Ui.x,0];return!ir(e,fs,ps,ms,Ka)||(e=[1,0,0,0,1,0,0,0,1],!ir(e,fs,ps,ms,Ka))?!1:(Ya.crossVectors(gi,vi),e=[Ya.x,Ya.y,Ya.z],ir(e,fs,ps,ms,Ka))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,wn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(wn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Jn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Jn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Jn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Jn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Jn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Jn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Jn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Jn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Jn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const Jn=[new G,new G,new G,new G,new G,new G,new G,new G],wn=new G,qa=new ls,fs=new G,ps=new G,ms=new G,gi=new G,vi=new G,Ui=new G,aa=new G,Ka=new G,Ya=new G,zi=new G;function ir(i,t,e,n,s){for(let a=0,o=i.length-3;a<=o;a+=3){zi.fromArray(i,a);const r=s.x*Math.abs(zi.x)+s.y*Math.abs(zi.y)+s.z*Math.abs(zi.z),l=t.dot(zi),c=e.dot(zi),d=n.dot(zi);if(Math.max(-Math.max(l,c,d),Math.min(l,c,d))>r)return!1}return!0}const Dp=new ls,oa=new G,sr=new G;class Js{constructor(t=new G,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):Dp.setFromPoints(t).getCenter(n);let s=0;for(let a=0,o=t.length;a<o;a++)s=Math.max(s,n.distanceToSquared(t[a]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;oa.subVectors(t,this.center);const e=oa.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(oa,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(sr.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(oa.copy(t.center).add(sr)),this.expandByPoint(oa.copy(t.center).sub(sr))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Qn=new G,ar=new G,Za=new G,xi=new G,or=new G,ja=new G,rr=new G;class uc{constructor(t=new G,e=new G(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Qn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Qn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Qn.copy(this.origin).addScaledVector(this.direction,e),Qn.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){ar.copy(t).add(e).multiplyScalar(.5),Za.copy(e).sub(t).normalize(),xi.copy(this.origin).sub(ar);const a=t.distanceTo(e)*.5,o=-this.direction.dot(Za),r=xi.dot(this.direction),l=-xi.dot(Za),c=xi.lengthSq(),d=Math.abs(1-o*o);let u,f,m,p;if(d>0)if(u=o*l-r,f=o*r-l,p=a*d,u>=0)if(f>=-p)if(f<=p){const S=1/d;u*=S,f*=S,m=u*(u+o*f+2*r)+f*(o*u+f+2*l)+c}else f=a,u=Math.max(0,-(o*f+r)),m=-u*u+f*(f+2*l)+c;else f=-a,u=Math.max(0,-(o*f+r)),m=-u*u+f*(f+2*l)+c;else f<=-p?(u=Math.max(0,-(-o*a+r)),f=u>0?-a:Math.min(Math.max(-a,-l),a),m=-u*u+f*(f+2*l)+c):f<=p?(u=0,f=Math.min(Math.max(-a,-l),a),m=f*(f+2*l)+c):(u=Math.max(0,-(o*a+r)),f=u>0?a:Math.min(Math.max(-a,-l),a),m=-u*u+f*(f+2*l)+c);else f=o>0?-a:a,u=Math.max(0,-(o*f+r)),m=-u*u+f*(f+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(ar).addScaledVector(Za,f),m}intersectSphere(t,e){Qn.subVectors(t.center,this.origin);const n=Qn.dot(this.direction),s=Qn.dot(Qn)-n*n,a=t.radius*t.radius;if(s>a)return null;const o=Math.sqrt(a-s),r=n-o,l=n+o;return l<0?null:r<0?this.at(l,e):this.at(r,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,a,o,r,l;const c=1/this.direction.x,d=1/this.direction.y,u=1/this.direction.z,f=this.origin;return c>=0?(n=(t.min.x-f.x)*c,s=(t.max.x-f.x)*c):(n=(t.max.x-f.x)*c,s=(t.min.x-f.x)*c),d>=0?(a=(t.min.y-f.y)*d,o=(t.max.y-f.y)*d):(a=(t.max.y-f.y)*d,o=(t.min.y-f.y)*d),n>o||a>s||((a>n||isNaN(n))&&(n=a),(o<s||isNaN(s))&&(s=o),u>=0?(r=(t.min.z-f.z)*u,l=(t.max.z-f.z)*u):(r=(t.max.z-f.z)*u,l=(t.min.z-f.z)*u),n>l||r>s)||((r>n||n!==n)&&(n=r),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,Qn)!==null}intersectTriangle(t,e,n,s,a){or.subVectors(e,t),ja.subVectors(n,t),rr.crossVectors(or,ja);let o=this.direction.dot(rr),r;if(o>0){if(s)return null;r=1}else if(o<0)r=-1,o=-o;else return null;xi.subVectors(this.origin,t);const l=r*this.direction.dot(ja.crossVectors(xi,ja));if(l<0)return null;const c=r*this.direction.dot(or.cross(xi));if(c<0||l+c>o)return null;const d=-r*xi.dot(rr);return d<0?null:this.at(d/o,a)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class _e{constructor(t,e,n,s,a,o,r,l,c,d,u,f,m,p,S,g){_e.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,a,o,r,l,c,d,u,f,m,p,S,g)}set(t,e,n,s,a,o,r,l,c,d,u,f,m,p,S,g){const h=this.elements;return h[0]=t,h[4]=e,h[8]=n,h[12]=s,h[1]=a,h[5]=o,h[9]=r,h[13]=l,h[2]=c,h[6]=d,h[10]=u,h[14]=f,h[3]=m,h[7]=p,h[11]=S,h[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new _e().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,s=1/gs.setFromMatrixColumn(t,0).length(),a=1/gs.setFromMatrixColumn(t,1).length(),o=1/gs.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*a,e[5]=n[5]*a,e[6]=n[6]*a,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,s=t.y,a=t.z,o=Math.cos(n),r=Math.sin(n),l=Math.cos(s),c=Math.sin(s),d=Math.cos(a),u=Math.sin(a);if(t.order==="XYZ"){const f=o*d,m=o*u,p=r*d,S=r*u;e[0]=l*d,e[4]=-l*u,e[8]=c,e[1]=m+p*c,e[5]=f-S*c,e[9]=-r*l,e[2]=S-f*c,e[6]=p+m*c,e[10]=o*l}else if(t.order==="YXZ"){const f=l*d,m=l*u,p=c*d,S=c*u;e[0]=f+S*r,e[4]=p*r-m,e[8]=o*c,e[1]=o*u,e[5]=o*d,e[9]=-r,e[2]=m*r-p,e[6]=S+f*r,e[10]=o*l}else if(t.order==="ZXY"){const f=l*d,m=l*u,p=c*d,S=c*u;e[0]=f-S*r,e[4]=-o*u,e[8]=p+m*r,e[1]=m+p*r,e[5]=o*d,e[9]=S-f*r,e[2]=-o*c,e[6]=r,e[10]=o*l}else if(t.order==="ZYX"){const f=o*d,m=o*u,p=r*d,S=r*u;e[0]=l*d,e[4]=p*c-m,e[8]=f*c+S,e[1]=l*u,e[5]=S*c+f,e[9]=m*c-p,e[2]=-c,e[6]=r*l,e[10]=o*l}else if(t.order==="YZX"){const f=o*l,m=o*c,p=r*l,S=r*c;e[0]=l*d,e[4]=S-f*u,e[8]=p*u+m,e[1]=u,e[5]=o*d,e[9]=-r*d,e[2]=-c*d,e[6]=m*u+p,e[10]=f-S*u}else if(t.order==="XZY"){const f=o*l,m=o*c,p=r*l,S=r*c;e[0]=l*d,e[4]=-u,e[8]=c*d,e[1]=f*u+S,e[5]=o*d,e[9]=m*u-p,e[2]=p*u-m,e[6]=r*d,e[10]=S*u+f}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Bp,t,Np)}lookAt(t,e,n){const s=this.elements;return hn.subVectors(t,e),hn.lengthSq()===0&&(hn.z=1),hn.normalize(),_i.crossVectors(n,hn),_i.lengthSq()===0&&(Math.abs(n.z)===1?hn.x+=1e-4:hn.z+=1e-4,hn.normalize(),_i.crossVectors(n,hn)),_i.normalize(),Ja.crossVectors(hn,_i),s[0]=_i.x,s[4]=Ja.x,s[8]=hn.x,s[1]=_i.y,s[5]=Ja.y,s[9]=hn.y,s[2]=_i.z,s[6]=Ja.z,s[10]=hn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,a=this.elements,o=n[0],r=n[4],l=n[8],c=n[12],d=n[1],u=n[5],f=n[9],m=n[13],p=n[2],S=n[6],g=n[10],h=n[14],b=n[3],w=n[7],y=n[11],C=n[15],v=s[0],T=s[4],P=s[8],x=s[12],M=s[1],_=s[5],N=s[9],U=s[13],H=s[2],z=s[6],L=s[10],A=s[14],E=s[3],I=s[7],V=s[11],$=s[15];return a[0]=o*v+r*M+l*H+c*E,a[4]=o*T+r*_+l*z+c*I,a[8]=o*P+r*N+l*L+c*V,a[12]=o*x+r*U+l*A+c*$,a[1]=d*v+u*M+f*H+m*E,a[5]=d*T+u*_+f*z+m*I,a[9]=d*P+u*N+f*L+m*V,a[13]=d*x+u*U+f*A+m*$,a[2]=p*v+S*M+g*H+h*E,a[6]=p*T+S*_+g*z+h*I,a[10]=p*P+S*N+g*L+h*V,a[14]=p*x+S*U+g*A+h*$,a[3]=b*v+w*M+y*H+C*E,a[7]=b*T+w*_+y*z+C*I,a[11]=b*P+w*N+y*L+C*V,a[15]=b*x+w*U+y*A+C*$,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],s=t[8],a=t[12],o=t[1],r=t[5],l=t[9],c=t[13],d=t[2],u=t[6],f=t[10],m=t[14],p=t[3],S=t[7],g=t[11],h=t[15];return p*(+a*l*u-s*c*u-a*r*f+n*c*f+s*r*m-n*l*m)+S*(+e*l*m-e*c*f+a*o*f-s*o*m+s*c*d-a*l*d)+g*(+e*c*u-e*r*m-a*o*u+n*o*m+a*r*d-n*c*d)+h*(-s*r*d-e*l*u+e*r*f+s*o*u-n*o*f+n*l*d)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],a=t[3],o=t[4],r=t[5],l=t[6],c=t[7],d=t[8],u=t[9],f=t[10],m=t[11],p=t[12],S=t[13],g=t[14],h=t[15],b=u*g*c-S*f*c+S*l*m-r*g*m-u*l*h+r*f*h,w=p*f*c-d*g*c-p*l*m+o*g*m+d*l*h-o*f*h,y=d*S*c-p*u*c+p*r*m-o*S*m-d*r*h+o*u*h,C=p*u*l-d*S*l-p*r*f+o*S*f+d*r*g-o*u*g,v=e*b+n*w+s*y+a*C;if(v===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const T=1/v;return t[0]=b*T,t[1]=(S*f*a-u*g*a-S*s*m+n*g*m+u*s*h-n*f*h)*T,t[2]=(r*g*a-S*l*a+S*s*c-n*g*c-r*s*h+n*l*h)*T,t[3]=(u*l*a-r*f*a-u*s*c+n*f*c+r*s*m-n*l*m)*T,t[4]=w*T,t[5]=(d*g*a-p*f*a+p*s*m-e*g*m-d*s*h+e*f*h)*T,t[6]=(p*l*a-o*g*a-p*s*c+e*g*c+o*s*h-e*l*h)*T,t[7]=(o*f*a-d*l*a+d*s*c-e*f*c-o*s*m+e*l*m)*T,t[8]=y*T,t[9]=(p*u*a-d*S*a-p*n*m+e*S*m+d*n*h-e*u*h)*T,t[10]=(o*S*a-p*r*a+p*n*c-e*S*c-o*n*h+e*r*h)*T,t[11]=(d*r*a-o*u*a-d*n*c+e*u*c+o*n*m-e*r*m)*T,t[12]=C*T,t[13]=(d*S*s-p*u*s+p*n*f-e*S*f-d*n*g+e*u*g)*T,t[14]=(p*r*s-o*S*s-p*n*l+e*S*l+o*n*g-e*r*g)*T,t[15]=(o*u*s-d*r*s+d*n*l-e*u*l-o*n*f+e*r*f)*T,this}scale(t){const e=this.elements,n=t.x,s=t.y,a=t.z;return e[0]*=n,e[4]*=s,e[8]*=a,e[1]*=n,e[5]*=s,e[9]*=a,e[2]*=n,e[6]*=s,e[10]*=a,e[3]*=n,e[7]*=s,e[11]*=a,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),s=Math.sin(e),a=1-n,o=t.x,r=t.y,l=t.z,c=a*o,d=a*r;return this.set(c*o+n,c*r-s*l,c*l+s*r,0,c*r+s*l,d*r+n,d*l-s*o,0,c*l-s*r,d*l+s*o,a*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,a,o){return this.set(1,n,a,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){const s=this.elements,a=e._x,o=e._y,r=e._z,l=e._w,c=a+a,d=o+o,u=r+r,f=a*c,m=a*d,p=a*u,S=o*d,g=o*u,h=r*u,b=l*c,w=l*d,y=l*u,C=n.x,v=n.y,T=n.z;return s[0]=(1-(S+h))*C,s[1]=(m+y)*C,s[2]=(p-w)*C,s[3]=0,s[4]=(m-y)*v,s[5]=(1-(f+h))*v,s[6]=(g+b)*v,s[7]=0,s[8]=(p+w)*T,s[9]=(g-b)*T,s[10]=(1-(f+S))*T,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){const s=this.elements;let a=gs.set(s[0],s[1],s[2]).length();const o=gs.set(s[4],s[5],s[6]).length(),r=gs.set(s[8],s[9],s[10]).length();this.determinant()<0&&(a=-a),t.x=s[12],t.y=s[13],t.z=s[14],Tn.copy(this);const c=1/a,d=1/o,u=1/r;return Tn.elements[0]*=c,Tn.elements[1]*=c,Tn.elements[2]*=c,Tn.elements[4]*=d,Tn.elements[5]*=d,Tn.elements[6]*=d,Tn.elements[8]*=u,Tn.elements[9]*=u,Tn.elements[10]*=u,e.setFromRotationMatrix(Tn),n.x=a,n.y=o,n.z=r,this}makePerspective(t,e,n,s,a,o,r=ai){const l=this.elements,c=2*a/(e-t),d=2*a/(n-s),u=(e+t)/(e-t),f=(n+s)/(n-s);let m,p;if(r===ai)m=-(o+a)/(o-a),p=-2*o*a/(o-a);else if(r===Io)m=-o/(o-a),p=-o*a/(o-a);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+r);return l[0]=c,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=d,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=p,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,s,a,o,r=ai){const l=this.elements,c=1/(e-t),d=1/(n-s),u=1/(o-a),f=(e+t)*c,m=(n+s)*d;let p,S;if(r===ai)p=(o+a)*u,S=-2*u;else if(r===Io)p=a*u,S=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+r);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-f,l[1]=0,l[5]=2*d,l[9]=0,l[13]=-m,l[2]=0,l[6]=0,l[10]=S,l[14]=-p,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const gs=new G,Tn=new _e,Bp=new G(0,0,0),Np=new G(1,1,1),_i=new G,Ja=new G,hn=new G,jc=new _e,Jc=new Ha;class Kn{constructor(t=0,e=0,n=0,s=Kn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const s=t.elements,a=s[0],o=s[4],r=s[8],l=s[1],c=s[5],d=s[9],u=s[2],f=s[6],m=s[10];switch(e){case"XYZ":this._y=Math.asin($e(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(-d,m),this._z=Math.atan2(-o,a)):(this._x=Math.atan2(f,c),this._z=0);break;case"YXZ":this._x=Math.asin(-$e(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(r,m),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,a),this._z=0);break;case"ZXY":this._x=Math.asin($e(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,m),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,a));break;case"ZYX":this._y=Math.asin(-$e(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,m),this._z=Math.atan2(l,a)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin($e(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-d,c),this._y=Math.atan2(-u,a)):(this._x=0,this._y=Math.atan2(r,m));break;case"XZY":this._z=Math.asin(-$e(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(f,c),this._y=Math.atan2(r,a)):(this._x=Math.atan2(-d,m),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return jc.makeRotationFromQuaternion(t),this.setFromRotationMatrix(jc,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Jc.setFromEuler(this),this.setFromQuaternion(Jc,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Kn.DEFAULT_ORDER="XYZ";class fc{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Up=0;const Qc=new G,vs=new Ha,ti=new _e,Qa=new G,ra=new G,zp=new G,Fp=new Ha,th=new G(1,0,0),eh=new G(0,1,0),nh=new G(0,0,1),ih={type:"added"},Op={type:"removed"},xs={type:"childadded",child:null},lr={type:"childremoved",child:null};class Oe extends js{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Up++}),this.uuid=rs(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Oe.DEFAULT_UP.clone();const t=new G,e=new Kn,n=new Ha,s=new G(1,1,1);function a(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(a),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new _e},normalMatrix:{value:new se}}),this.matrix=new _e,this.matrixWorld=new _e,this.matrixAutoUpdate=Oe.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Oe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new fc,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return vs.setFromAxisAngle(t,e),this.quaternion.multiply(vs),this}rotateOnWorldAxis(t,e){return vs.setFromAxisAngle(t,e),this.quaternion.premultiply(vs),this}rotateX(t){return this.rotateOnAxis(th,t)}rotateY(t){return this.rotateOnAxis(eh,t)}rotateZ(t){return this.rotateOnAxis(nh,t)}translateOnAxis(t,e){return Qc.copy(t).applyQuaternion(this.quaternion),this.position.add(Qc.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(th,t)}translateY(t){return this.translateOnAxis(eh,t)}translateZ(t){return this.translateOnAxis(nh,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(ti.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Qa.copy(t):Qa.set(t,e,n);const s=this.parent;this.updateWorldMatrix(!0,!1),ra.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ti.lookAt(ra,Qa,this.up):ti.lookAt(Qa,ra,this.up),this.quaternion.setFromRotationMatrix(ti),s&&(ti.extractRotation(s.matrixWorld),vs.setFromRotationMatrix(ti),this.quaternion.premultiply(vs.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(ih),xs.child=t,this.dispatchEvent(xs),xs.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Op),lr.child=t,this.dispatchEvent(lr),lr.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),ti.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),ti.multiply(t.parent.matrixWorld)),t.applyMatrix4(ti),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(ih),xs.child=t,this.dispatchEvent(xs),xs.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){const o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const s=this.children;for(let a=0,o=s.length;a<o;a++)s[a].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ra,t,zp),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ra,Fp,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const s=this.children;for(let a=0,o=s.length;a<o;a++)s[a].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(r=>({boxInitialized:r.boxInitialized,boxMin:r.box.min.toArray(),boxMax:r.box.max.toArray(),sphereInitialized:r.sphereInitialized,sphereRadius:r.sphere.radius,sphereCenter:r.sphere.center.toArray()})),s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function a(r,l){return r[l.uuid]===void 0&&(r[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=a(t.geometries,this.geometry);const r=this.geometry.parameters;if(r!==void 0&&r.shapes!==void 0){const l=r.shapes;if(Array.isArray(l))for(let c=0,d=l.length;c<d;c++){const u=l[c];a(t.shapes,u)}else a(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(a(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const r=[];for(let l=0,c=this.material.length;l<c;l++)r.push(a(t.materials,this.material[l]));s.material=r}else s.material=a(t.materials,this.material);if(this.children.length>0){s.children=[];for(let r=0;r<this.children.length;r++)s.children.push(this.children[r].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let r=0;r<this.animations.length;r++){const l=this.animations[r];s.animations.push(a(t.animations,l))}}if(e){const r=o(t.geometries),l=o(t.materials),c=o(t.textures),d=o(t.images),u=o(t.shapes),f=o(t.skeletons),m=o(t.animations),p=o(t.nodes);r.length>0&&(n.geometries=r),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),d.length>0&&(n.images=d),u.length>0&&(n.shapes=u),f.length>0&&(n.skeletons=f),m.length>0&&(n.animations=m),p.length>0&&(n.nodes=p)}return n.object=s,n;function o(r){const l=[];for(const c in r){const d=r[c];delete d.metadata,l.push(d)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const s=t.children[n];this.add(s.clone())}return this}}Oe.DEFAULT_UP=new G(0,1,0);Oe.DEFAULT_MATRIX_AUTO_UPDATE=!0;Oe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const En=new G,ei=new G,cr=new G,ni=new G,_s=new G,Ms=new G,sh=new G,hr=new G,dr=new G,ur=new G,fr=new be,pr=new be,mr=new be;class An{constructor(t=new G,e=new G,n=new G){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),En.subVectors(t,e),s.cross(En);const a=s.lengthSq();return a>0?s.multiplyScalar(1/Math.sqrt(a)):s.set(0,0,0)}static getBarycoord(t,e,n,s,a){En.subVectors(s,e),ei.subVectors(n,e),cr.subVectors(t,e);const o=En.dot(En),r=En.dot(ei),l=En.dot(cr),c=ei.dot(ei),d=ei.dot(cr),u=o*c-r*r;if(u===0)return a.set(0,0,0),null;const f=1/u,m=(c*l-r*d)*f,p=(o*d-r*l)*f;return a.set(1-m-p,p,m)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,ni)===null?!1:ni.x>=0&&ni.y>=0&&ni.x+ni.y<=1}static getInterpolation(t,e,n,s,a,o,r,l){return this.getBarycoord(t,e,n,s,ni)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(a,ni.x),l.addScaledVector(o,ni.y),l.addScaledVector(r,ni.z),l)}static getInterpolatedAttribute(t,e,n,s,a,o){return fr.setScalar(0),pr.setScalar(0),mr.setScalar(0),fr.fromBufferAttribute(t,e),pr.fromBufferAttribute(t,n),mr.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(fr,a.x),o.addScaledVector(pr,a.y),o.addScaledVector(mr,a.z),o}static isFrontFacing(t,e,n,s){return En.subVectors(n,e),ei.subVectors(t,e),En.cross(ei).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return En.subVectors(this.c,this.b),ei.subVectors(this.a,this.b),En.cross(ei).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return An.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return An.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,a){return An.getInterpolation(t,this.a,this.b,this.c,e,n,s,a)}containsPoint(t){return An.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return An.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,s=this.b,a=this.c;let o,r;_s.subVectors(s,n),Ms.subVectors(a,n),hr.subVectors(t,n);const l=_s.dot(hr),c=Ms.dot(hr);if(l<=0&&c<=0)return e.copy(n);dr.subVectors(t,s);const d=_s.dot(dr),u=Ms.dot(dr);if(d>=0&&u<=d)return e.copy(s);const f=l*u-d*c;if(f<=0&&l>=0&&d<=0)return o=l/(l-d),e.copy(n).addScaledVector(_s,o);ur.subVectors(t,a);const m=_s.dot(ur),p=Ms.dot(ur);if(p>=0&&m<=p)return e.copy(a);const S=m*c-l*p;if(S<=0&&c>=0&&p<=0)return r=c/(c-p),e.copy(n).addScaledVector(Ms,r);const g=d*p-m*u;if(g<=0&&u-d>=0&&m-p>=0)return sh.subVectors(a,s),r=(u-d)/(u-d+(m-p)),e.copy(s).addScaledVector(sh,r);const h=1/(g+S+f);return o=S*h,r=f*h,e.copy(n).addScaledVector(_s,o).addScaledVector(Ms,r)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const Du={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Mi={h:0,s:0,l:0},to={h:0,s:0,l:0};function gr(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}class Tt{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=qe){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,de.toWorkingColorSpace(this,e),this}setRGB(t,e,n,s=de.workingColorSpace){return this.r=t,this.g=e,this.b=n,de.toWorkingColorSpace(this,s),this}setHSL(t,e,n,s=de.workingColorSpace){if(t=dc(t,1),e=$e(e,0,1),n=$e(n,0,1),e===0)this.r=this.g=this.b=n;else{const a=n<=.5?n*(1+e):n+e-n*e,o=2*n-a;this.r=gr(o,a,t+1/3),this.g=gr(o,a,t),this.b=gr(o,a,t-1/3)}return de.toWorkingColorSpace(this,s),this}setStyle(t,e=qe){function n(a){a!==void 0&&parseFloat(a)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let a;const o=s[1],r=s[2];switch(o){case"rgb":case"rgba":if(a=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(r))return n(a[4]),this.setRGB(Math.min(255,parseInt(a[1],10))/255,Math.min(255,parseInt(a[2],10))/255,Math.min(255,parseInt(a[3],10))/255,e);if(a=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(r))return n(a[4]),this.setRGB(Math.min(100,parseInt(a[1],10))/100,Math.min(100,parseInt(a[2],10))/100,Math.min(100,parseInt(a[3],10))/100,e);break;case"hsl":case"hsla":if(a=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(r))return n(a[4]),this.setHSL(parseFloat(a[1])/360,parseFloat(a[2])/100,parseFloat(a[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const a=s[1],o=a.length;if(o===3)return this.setRGB(parseInt(a.charAt(0),16)/15,parseInt(a.charAt(1),16)/15,parseInt(a.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(a,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=qe){const n=Du[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=hi(t.r),this.g=hi(t.g),this.b=hi(t.b),this}copyLinearToSRGB(t){return this.r=Ns(t.r),this.g=Ns(t.g),this.b=Ns(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=qe){return de.fromWorkingColorSpace(je.copy(this),t),Math.round($e(je.r*255,0,255))*65536+Math.round($e(je.g*255,0,255))*256+Math.round($e(je.b*255,0,255))}getHexString(t=qe){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=de.workingColorSpace){de.fromWorkingColorSpace(je.copy(this),e);const n=je.r,s=je.g,a=je.b,o=Math.max(n,s,a),r=Math.min(n,s,a);let l,c;const d=(r+o)/2;if(r===o)l=0,c=0;else{const u=o-r;switch(c=d<=.5?u/(o+r):u/(2-o-r),o){case n:l=(s-a)/u+(s<a?6:0);break;case s:l=(a-n)/u+2;break;case a:l=(n-s)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=d,t}getRGB(t,e=de.workingColorSpace){return de.fromWorkingColorSpace(je.copy(this),e),t.r=je.r,t.g=je.g,t.b=je.b,t}getStyle(t=qe){de.fromWorkingColorSpace(je.copy(this),t);const e=je.r,n=je.g,s=je.b;return t!==qe?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Mi),this.setHSL(Mi.h+t,Mi.s+e,Mi.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Mi),t.getHSL(to);const n=ya(Mi.h,to.h,e),s=ya(Mi.s,to.s,e),a=ya(Mi.l,to.l,e);return this.setHSL(n,s,a),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,s=this.b,a=t.elements;return this.r=a[0]*e+a[3]*n+a[6]*s,this.g=a[1]*e+a[4]*n+a[7]*s,this.b=a[2]*e+a[5]*n+a[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const je=new Tt;Tt.NAMES=Du;let Hp=0;class Qs extends js{static get type(){return"Material"}get type(){return this.constructor.type}set type(t){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Hp++}),this.uuid=rs(),this.name="",this.blending=Ds,this.side=Di,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=tl,this.blendDst=el,this.blendEquation=Xi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Tt(0,0,0),this.blendAlpha=0,this.depthFunc=Fs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Oc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ds,this.stencilZFail=ds,this.stencilZPass=ds,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Ds&&(n.blending=this.blending),this.side!==Di&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==tl&&(n.blendSrc=this.blendSrc),this.blendDst!==el&&(n.blendDst=this.blendDst),this.blendEquation!==Xi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Fs&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Oc&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ds&&(n.stencilFail=this.stencilFail),this.stencilZFail!==ds&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==ds&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(a){const o=[];for(const r in a){const l=a[r];delete l.metadata,o.push(l)}return o}if(e){const a=s(t.textures),o=s(t.images);a.length>0&&(n.textures=a),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const s=e.length;n=new Array(s);for(let a=0;a!==s;++a)n[a]=e[a].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class le extends Qs{static get type(){return"MeshBasicMaterial"}constructor(t){super(),this.isMeshBasicMaterial=!0,this.color=new Tt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kn,this.combine=fu,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const Be=new G,eo=new ft;class Le{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Hc,this.updateRanges=[],this.gpuType=Gn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,a=this.itemSize;s<a;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)eo.fromBufferAttribute(this,e),eo.applyMatrix3(t),this.setXY(e,eo.x,eo.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Be.fromBufferAttribute(this,e),Be.applyMatrix3(t),this.setXYZ(e,Be.x,Be.y,Be.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Be.fromBufferAttribute(this,e),Be.applyMatrix4(t),this.setXYZ(e,Be.x,Be.y,Be.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Be.fromBufferAttribute(this,e),Be.applyNormalMatrix(t),this.setXYZ(e,Be.x,Be.y,Be.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Be.fromBufferAttribute(this,e),Be.transformDirection(t),this.setXYZ(e,Be.x,Be.y,Be.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Ps(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=tn(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ps(e,this.array)),e}setX(t,e){return this.normalized&&(e=tn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ps(e,this.array)),e}setY(t,e){return this.normalized&&(e=tn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ps(e,this.array)),e}setZ(t,e){return this.normalized&&(e=tn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ps(e,this.array)),e}setW(t,e){return this.normalized&&(e=tn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=tn(e,this.array),n=tn(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=tn(e,this.array),n=tn(n,this.array),s=tn(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,a){return t*=this.itemSize,this.normalized&&(e=tn(e,this.array),n=tn(n,this.array),s=tn(s,this.array),a=tn(a,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=a,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Hc&&(t.usage=this.usage),t}}class Bu extends Le{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class Nu extends Le{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class pe extends Le{constructor(t,e,n){super(new Float32Array(t),e,n)}}let Gp=0;const vn=new _e,vr=new Oe,ys=new G,dn=new ls,la=new ls,Ve=new G;class Ue extends js{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Gp++}),this.uuid=rs(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(ku(t)?Nu:Bu)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const a=new se().getNormalMatrix(t);n.applyNormalMatrix(a),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return vn.makeRotationFromQuaternion(t),this.applyMatrix4(vn),this}rotateX(t){return vn.makeRotationX(t),this.applyMatrix4(vn),this}rotateY(t){return vn.makeRotationY(t),this.applyMatrix4(vn),this}rotateZ(t){return vn.makeRotationZ(t),this.applyMatrix4(vn),this}translate(t,e,n){return vn.makeTranslation(t,e,n),this.applyMatrix4(vn),this}scale(t,e,n){return vn.makeScale(t,e,n),this.applyMatrix4(vn),this}lookAt(t){return vr.lookAt(t),vr.updateMatrix(),this.applyMatrix4(vr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ys).negate(),this.translate(ys.x,ys.y,ys.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let s=0,a=t.length;s<a;s++){const o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new pe(n,3))}else{for(let n=0,s=e.count;n<s;n++){const a=t[n];e.setXYZ(n,a.x,a.y,a.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ls);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new G(-1/0,-1/0,-1/0),new G(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){const a=e[n];dn.setFromBufferAttribute(a),this.morphTargetsRelative?(Ve.addVectors(this.boundingBox.min,dn.min),this.boundingBox.expandByPoint(Ve),Ve.addVectors(this.boundingBox.max,dn.max),this.boundingBox.expandByPoint(Ve)):(this.boundingBox.expandByPoint(dn.min),this.boundingBox.expandByPoint(dn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Js);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new G,1/0);return}if(t){const n=this.boundingSphere.center;if(dn.setFromBufferAttribute(t),e)for(let a=0,o=e.length;a<o;a++){const r=e[a];la.setFromBufferAttribute(r),this.morphTargetsRelative?(Ve.addVectors(dn.min,la.min),dn.expandByPoint(Ve),Ve.addVectors(dn.max,la.max),dn.expandByPoint(Ve)):(dn.expandByPoint(la.min),dn.expandByPoint(la.max))}dn.getCenter(n);let s=0;for(let a=0,o=t.count;a<o;a++)Ve.fromBufferAttribute(t,a),s=Math.max(s,n.distanceToSquared(Ve));if(e)for(let a=0,o=e.length;a<o;a++){const r=e[a],l=this.morphTargetsRelative;for(let c=0,d=r.count;c<d;c++)Ve.fromBufferAttribute(r,c),l&&(ys.fromBufferAttribute(t,c),Ve.add(ys)),s=Math.max(s,n.distanceToSquared(Ve))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,s=e.normal,a=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Le(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),r=[],l=[];for(let P=0;P<n.count;P++)r[P]=new G,l[P]=new G;const c=new G,d=new G,u=new G,f=new ft,m=new ft,p=new ft,S=new G,g=new G;function h(P,x,M){c.fromBufferAttribute(n,P),d.fromBufferAttribute(n,x),u.fromBufferAttribute(n,M),f.fromBufferAttribute(a,P),m.fromBufferAttribute(a,x),p.fromBufferAttribute(a,M),d.sub(c),u.sub(c),m.sub(f),p.sub(f);const _=1/(m.x*p.y-p.x*m.y);isFinite(_)&&(S.copy(d).multiplyScalar(p.y).addScaledVector(u,-m.y).multiplyScalar(_),g.copy(u).multiplyScalar(m.x).addScaledVector(d,-p.x).multiplyScalar(_),r[P].add(S),r[x].add(S),r[M].add(S),l[P].add(g),l[x].add(g),l[M].add(g))}let b=this.groups;b.length===0&&(b=[{start:0,count:t.count}]);for(let P=0,x=b.length;P<x;++P){const M=b[P],_=M.start,N=M.count;for(let U=_,H=_+N;U<H;U+=3)h(t.getX(U+0),t.getX(U+1),t.getX(U+2))}const w=new G,y=new G,C=new G,v=new G;function T(P){C.fromBufferAttribute(s,P),v.copy(C);const x=r[P];w.copy(x),w.sub(C.multiplyScalar(C.dot(x))).normalize(),y.crossVectors(v,x);const _=y.dot(l[P])<0?-1:1;o.setXYZW(P,w.x,w.y,w.z,_)}for(let P=0,x=b.length;P<x;++P){const M=b[P],_=M.start,N=M.count;for(let U=_,H=_+N;U<H;U+=3)T(t.getX(U+0)),T(t.getX(U+1)),T(t.getX(U+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Le(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let f=0,m=n.count;f<m;f++)n.setXYZ(f,0,0,0);const s=new G,a=new G,o=new G,r=new G,l=new G,c=new G,d=new G,u=new G;if(t)for(let f=0,m=t.count;f<m;f+=3){const p=t.getX(f+0),S=t.getX(f+1),g=t.getX(f+2);s.fromBufferAttribute(e,p),a.fromBufferAttribute(e,S),o.fromBufferAttribute(e,g),d.subVectors(o,a),u.subVectors(s,a),d.cross(u),r.fromBufferAttribute(n,p),l.fromBufferAttribute(n,S),c.fromBufferAttribute(n,g),r.add(d),l.add(d),c.add(d),n.setXYZ(p,r.x,r.y,r.z),n.setXYZ(S,l.x,l.y,l.z),n.setXYZ(g,c.x,c.y,c.z)}else for(let f=0,m=e.count;f<m;f+=3)s.fromBufferAttribute(e,f+0),a.fromBufferAttribute(e,f+1),o.fromBufferAttribute(e,f+2),d.subVectors(o,a),u.subVectors(s,a),d.cross(u),n.setXYZ(f+0,d.x,d.y,d.z),n.setXYZ(f+1,d.x,d.y,d.z),n.setXYZ(f+2,d.x,d.y,d.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Ve.fromBufferAttribute(t,e),Ve.normalize(),t.setXYZ(e,Ve.x,Ve.y,Ve.z)}toNonIndexed(){function t(r,l){const c=r.array,d=r.itemSize,u=r.normalized,f=new c.constructor(l.length*d);let m=0,p=0;for(let S=0,g=l.length;S<g;S++){r.isInterleavedBufferAttribute?m=l[S]*r.data.stride+r.offset:m=l[S]*d;for(let h=0;h<d;h++)f[p++]=c[m++]}return new Le(f,d,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Ue,n=this.index.array,s=this.attributes;for(const r in s){const l=s[r],c=t(l,n);e.setAttribute(r,c)}const a=this.morphAttributes;for(const r in a){const l=[],c=a[r];for(let d=0,u=c.length;d<u;d++){const f=c[d],m=t(f,n);l.push(m)}e.morphAttributes[r]=l}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let r=0,l=o.length;r<l;r++){const c=o[r];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const s={};let a=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],d=[];for(let u=0,f=c.length;u<f;u++){const m=c[u];d.push(m.toJSON(t.data))}d.length>0&&(s[l]=d,a=!0)}a&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const r=this.boundingSphere;return r!==null&&(t.data.boundingSphere={center:r.center.toArray(),radius:r.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const s=t.attributes;for(const c in s){const d=s[c];this.setAttribute(c,d.clone(e))}const a=t.morphAttributes;for(const c in a){const d=[],u=a[c];for(let f=0,m=u.length;f<m;f++)d.push(u[f].clone(e));this.morphAttributes[c]=d}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let c=0,d=o.length;c<d;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const r=t.boundingBox;r!==null&&(this.boundingBox=r.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const ah=new _e,Fi=new uc,no=new Js,oh=new G,io=new G,so=new G,ao=new G,xr=new G,oo=new G,rh=new G,ro=new G;class F extends Oe{constructor(t=new Ue,e=new le){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,o=s.length;a<o;a++){const r=s[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[r]=a}}}}getVertexPosition(t,e){const n=this.geometry,s=n.attributes.position,a=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);const r=this.morphTargetInfluences;if(a&&r){oo.set(0,0,0);for(let l=0,c=a.length;l<c;l++){const d=r[l],u=a[l];d!==0&&(xr.fromBufferAttribute(u,t),o?oo.addScaledVector(xr,d):oo.addScaledVector(xr.sub(e),d))}e.add(oo)}return e}raycast(t,e){const n=this.geometry,s=this.material,a=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),no.copy(n.boundingSphere),no.applyMatrix4(a),Fi.copy(t.ray).recast(t.near),!(no.containsPoint(Fi.origin)===!1&&(Fi.intersectSphere(no,oh)===null||Fi.origin.distanceToSquared(oh)>(t.far-t.near)**2))&&(ah.copy(a).invert(),Fi.copy(t.ray).applyMatrix4(ah),!(n.boundingBox!==null&&Fi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Fi)))}_computeIntersections(t,e,n){let s;const a=this.geometry,o=this.material,r=a.index,l=a.attributes.position,c=a.attributes.uv,d=a.attributes.uv1,u=a.attributes.normal,f=a.groups,m=a.drawRange;if(r!==null)if(Array.isArray(o))for(let p=0,S=f.length;p<S;p++){const g=f[p],h=o[g.materialIndex],b=Math.max(g.start,m.start),w=Math.min(r.count,Math.min(g.start+g.count,m.start+m.count));for(let y=b,C=w;y<C;y+=3){const v=r.getX(y),T=r.getX(y+1),P=r.getX(y+2);s=lo(this,h,t,n,c,d,u,v,T,P),s&&(s.faceIndex=Math.floor(y/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{const p=Math.max(0,m.start),S=Math.min(r.count,m.start+m.count);for(let g=p,h=S;g<h;g+=3){const b=r.getX(g),w=r.getX(g+1),y=r.getX(g+2);s=lo(this,o,t,n,c,d,u,b,w,y),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let p=0,S=f.length;p<S;p++){const g=f[p],h=o[g.materialIndex],b=Math.max(g.start,m.start),w=Math.min(l.count,Math.min(g.start+g.count,m.start+m.count));for(let y=b,C=w;y<C;y+=3){const v=y,T=y+1,P=y+2;s=lo(this,h,t,n,c,d,u,v,T,P),s&&(s.faceIndex=Math.floor(y/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{const p=Math.max(0,m.start),S=Math.min(l.count,m.start+m.count);for(let g=p,h=S;g<h;g+=3){const b=g,w=g+1,y=g+2;s=lo(this,o,t,n,c,d,u,b,w,y),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}}}function Vp(i,t,e,n,s,a,o,r){let l;if(t.side===sn?l=n.intersectTriangle(o,a,s,!0,r):l=n.intersectTriangle(s,a,o,t.side===Di,r),l===null)return null;ro.copy(r),ro.applyMatrix4(i.matrixWorld);const c=e.ray.origin.distanceTo(ro);return c<e.near||c>e.far?null:{distance:c,point:ro.clone(),object:i}}function lo(i,t,e,n,s,a,o,r,l,c){i.getVertexPosition(r,io),i.getVertexPosition(l,so),i.getVertexPosition(c,ao);const d=Vp(i,t,e,n,io,so,ao,rh);if(d){const u=new G;An.getBarycoord(rh,io,so,ao,u),s&&(d.uv=An.getInterpolatedAttribute(s,r,l,c,u,new ft)),a&&(d.uv1=An.getInterpolatedAttribute(a,r,l,c,u,new ft)),o&&(d.normal=An.getInterpolatedAttribute(o,r,l,c,u,new G),d.normal.dot(n.direction)>0&&d.normal.multiplyScalar(-1));const f={a:r,b:l,c,normal:new G,materialIndex:0};An.getNormal(io,so,ao,f.normal),d.face=f,d.barycoord=u}return d}class Nt extends Ue{constructor(t=1,e=1,n=1,s=1,a=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:a,depthSegments:o};const r=this;s=Math.floor(s),a=Math.floor(a),o=Math.floor(o);const l=[],c=[],d=[],u=[];let f=0,m=0;p("z","y","x",-1,-1,n,e,t,o,a,0),p("z","y","x",1,-1,n,e,-t,o,a,1),p("x","z","y",1,1,t,n,e,s,o,2),p("x","z","y",1,-1,t,n,-e,s,o,3),p("x","y","z",1,-1,t,e,n,s,a,4),p("x","y","z",-1,-1,t,e,-n,s,a,5),this.setIndex(l),this.setAttribute("position",new pe(c,3)),this.setAttribute("normal",new pe(d,3)),this.setAttribute("uv",new pe(u,2));function p(S,g,h,b,w,y,C,v,T,P,x){const M=y/T,_=C/P,N=y/2,U=C/2,H=v/2,z=T+1,L=P+1;let A=0,E=0;const I=new G;for(let V=0;V<L;V++){const $=V*_-U;for(let Q=0;Q<z;Q++){const it=Q*M-N;I[S]=it*b,I[g]=$*w,I[h]=H,c.push(I.x,I.y,I.z),I[S]=0,I[g]=0,I[h]=v>0?1:-1,d.push(I.x,I.y,I.z),u.push(Q/T),u.push(1-V/P),A+=1}}for(let V=0;V<P;V++)for(let $=0;$<T;$++){const Q=f+$+z*V,it=f+$+z*(V+1),W=f+($+1)+z*(V+1),j=f+($+1)+z*V;l.push(Q,it,j),l.push(it,W,j),E+=6}r.addGroup(m,E,x),m+=E,f+=A}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Nt(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function $s(i){const t={};for(const e in i){t[e]={};for(const n in i[e]){const s=i[e][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone():Array.isArray(s)?t[e][n]=s.slice():t[e][n]=s}}return t}function en(i){const t={};for(let e=0;e<i.length;e++){const n=$s(i[e]);for(const s in n)t[s]=n[s]}return t}function $p(i){const t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function Uu(i){const t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:de.workingColorSpace}const Da={clone:$s,merge:en};var Wp=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Xp=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Fe extends Qs{static get type(){return"ShaderMaterial"}constructor(t){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Wp,this.fragmentShader=Xp,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=$s(t.uniforms),this.uniformsGroups=$p(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class zu extends Oe{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new _e,this.projectionMatrix=new _e,this.projectionMatrixInverse=new _e,this.coordinateSystem=ai}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const yi=new G,lh=new ft,ch=new ft;class pn extends zu{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=La*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Ma*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return La*2*Math.atan(Math.tan(Ma*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){yi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(yi.x,yi.y).multiplyScalar(-t/yi.z),yi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(yi.x,yi.y).multiplyScalar(-t/yi.z)}getViewSize(t,e){return this.getViewBounds(t,lh,ch),e.subVectors(ch,lh)}setViewOffset(t,e,n,s,a,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=a,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Ma*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,a=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;a+=o.offsetX*s/l,e-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}const r=this.filmOffset;r!==0&&(a+=t*r/this.getFilmWidth()),this.projectionMatrix.makePerspective(a,a+s,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Ss=-90,bs=1;class qp extends Oe{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new pn(Ss,bs,t,e);s.layers=this.layers,this.add(s);const a=new pn(Ss,bs,t,e);a.layers=this.layers,this.add(a);const o=new pn(Ss,bs,t,e);o.layers=this.layers,this.add(o);const r=new pn(Ss,bs,t,e);r.layers=this.layers,this.add(r);const l=new pn(Ss,bs,t,e);l.layers=this.layers,this.add(l);const c=new pn(Ss,bs,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,s,a,o,r,l]=e;for(const c of e)this.remove(c);if(t===ai)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),a.up.set(0,0,-1),a.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),r.up.set(0,1,0),r.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Io)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),a.up.set(0,0,1),a.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),r.up.set(0,-1,0),r.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[a,o,r,l,c,d]=this.children,u=t.getRenderTarget(),f=t.getActiveCubeFace(),m=t.getActiveMipmapLevel(),p=t.xr.enabled;t.xr.enabled=!1;const S=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,s),t.render(e,a),t.setRenderTarget(n,1,s),t.render(e,o),t.setRenderTarget(n,2,s),t.render(e,r),t.setRenderTarget(n,3,s),t.render(e,l),t.setRenderTarget(n,4,s),t.render(e,c),n.texture.generateMipmaps=S,t.setRenderTarget(n,5,s),t.render(e,d),t.setRenderTarget(u,f,m),t.xr.enabled=p,n.texture.needsPMREMUpdate=!0}}class Fu extends Je{constructor(t,e,n,s,a,o,r,l,c,d){t=t!==void 0?t:[],e=e!==void 0?e:Os,super(t,e,n,s,a,o,r,l,c,d),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Kp extends kn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new Fu(s,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:Hn}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Nt(5,5,5),a=new Fe({name:"CubemapFromEquirect",uniforms:$s(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:sn,blending:li});a.uniforms.tEquirect.value=e;const o=new F(s,a),r=e.minFilter;return e.minFilter===Yi&&(e.minFilter=Hn),new qp(1,10,this).update(t,o),e.minFilter=r,o.geometry.dispose(),o.material.dispose(),this}clear(t,e,n,s){const a=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(a)}}const _r=new G,Yp=new G,Zp=new se;class wi{constructor(t=new G(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const s=_r.subVectors(n,e).cross(Yp.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(_r),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const a=-(t.start.dot(this.normal)+this.constant)/s;return a<0||a>1?null:e.copy(t.start).addScaledVector(n,a)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Zp.getNormalMatrix(t),s=this.coplanarPoint(_r).applyMatrix4(t),a=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(a),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Oi=new Js,co=new G;class pc{constructor(t=new wi,e=new wi,n=new wi,s=new wi,a=new wi,o=new wi){this.planes=[t,e,n,s,a,o]}set(t,e,n,s,a,o){const r=this.planes;return r[0].copy(t),r[1].copy(e),r[2].copy(n),r[3].copy(s),r[4].copy(a),r[5].copy(o),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=ai){const n=this.planes,s=t.elements,a=s[0],o=s[1],r=s[2],l=s[3],c=s[4],d=s[5],u=s[6],f=s[7],m=s[8],p=s[9],S=s[10],g=s[11],h=s[12],b=s[13],w=s[14],y=s[15];if(n[0].setComponents(l-a,f-c,g-m,y-h).normalize(),n[1].setComponents(l+a,f+c,g+m,y+h).normalize(),n[2].setComponents(l+o,f+d,g+p,y+b).normalize(),n[3].setComponents(l-o,f-d,g-p,y-b).normalize(),n[4].setComponents(l-r,f-u,g-S,y-w).normalize(),e===ai)n[5].setComponents(l+r,f+u,g+S,y+w).normalize();else if(e===Io)n[5].setComponents(r,u,S,w).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Oi.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Oi.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Oi)}intersectsSprite(t){return Oi.center.set(0,0,0),Oi.radius=.7071067811865476,Oi.applyMatrix4(t.matrixWorld),this.intersectsSphere(Oi)}intersectsSphere(t){const e=this.planes,n=t.center,s=-t.radius;for(let a=0;a<6;a++)if(e[a].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const s=e[n];if(co.x=s.normal.x>0?t.max.x:t.min.x,co.y=s.normal.y>0?t.max.y:t.min.y,co.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(co)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Ou(){let i=null,t=!1,e=null,n=null;function s(a,o){e(a,o),n=i.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(a){e=a},setContext:function(a){i=a}}}function jp(i){const t=new WeakMap;function e(r,l){const c=r.array,d=r.usage,u=c.byteLength,f=i.createBuffer();i.bindBuffer(l,f),i.bufferData(l,c,d),r.onUploadCallback();let m;if(c instanceof Float32Array)m=i.FLOAT;else if(c instanceof Uint16Array)r.isFloat16BufferAttribute?m=i.HALF_FLOAT:m=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)m=i.SHORT;else if(c instanceof Uint32Array)m=i.UNSIGNED_INT;else if(c instanceof Int32Array)m=i.INT;else if(c instanceof Int8Array)m=i.BYTE;else if(c instanceof Uint8Array)m=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)m=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:f,type:m,bytesPerElement:c.BYTES_PER_ELEMENT,version:r.version,size:u}}function n(r,l,c){const d=l.array,u=l.updateRanges;if(i.bindBuffer(c,r),u.length===0)i.bufferSubData(c,0,d);else{u.sort((m,p)=>m.start-p.start);let f=0;for(let m=1;m<u.length;m++){const p=u[f],S=u[m];S.start<=p.start+p.count+1?p.count=Math.max(p.count,S.start+S.count-p.start):(++f,u[f]=S)}u.length=f+1;for(let m=0,p=u.length;m<p;m++){const S=u[m];i.bufferSubData(c,S.start*d.BYTES_PER_ELEMENT,d,S.start,S.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(r){return r.isInterleavedBufferAttribute&&(r=r.data),t.get(r)}function a(r){r.isInterleavedBufferAttribute&&(r=r.data);const l=t.get(r);l&&(i.deleteBuffer(l.buffer),t.delete(r))}function o(r,l){if(r.isInterleavedBufferAttribute&&(r=r.data),r.isGLBufferAttribute){const d=t.get(r);(!d||d.version<r.version)&&t.set(r,{buffer:r.buffer,type:r.type,bytesPerElement:r.elementSize,version:r.version});return}const c=t.get(r);if(c===void 0)t.set(r,e(r,l));else if(c.version<r.version){if(c.size!==r.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,r,l),c.version=r.version}}return{get:s,remove:a,update:o}}class Xe extends Ue{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};const a=t/2,o=e/2,r=Math.floor(n),l=Math.floor(s),c=r+1,d=l+1,u=t/r,f=e/l,m=[],p=[],S=[],g=[];for(let h=0;h<d;h++){const b=h*f-o;for(let w=0;w<c;w++){const y=w*u-a;p.push(y,-b,0),S.push(0,0,1),g.push(w/r),g.push(1-h/l)}}for(let h=0;h<l;h++)for(let b=0;b<r;b++){const w=b+c*h,y=b+c*(h+1),C=b+1+c*(h+1),v=b+1+c*h;m.push(w,y,v),m.push(y,C,v)}this.setIndex(m),this.setAttribute("position",new pe(p,3)),this.setAttribute("normal",new pe(S,3)),this.setAttribute("uv",new pe(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Xe(t.width,t.height,t.widthSegments,t.heightSegments)}}var Jp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Qp=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,tm=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,em=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,nm=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,im=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,sm=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,am=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,om=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,rm=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,lm=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,cm=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,hm=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,dm=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,um=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,fm=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,pm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,mm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,gm=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,vm=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,xm=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,_m=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Mm=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,ym=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Sm=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,bm=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,wm=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Tm=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Em=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Cm=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Am="gl_FragColor = linearToOutputTexel( gl_FragColor );",Rm=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Pm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,km=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Im=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Lm=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Dm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Bm=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Nm=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Um=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,zm=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Fm=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Om=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Hm=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Gm=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Vm=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,$m=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Wm=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Xm=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,qm=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Km=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Ym=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Zm=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,jm=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Jm=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Qm=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,t0=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,e0=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,n0=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,i0=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,s0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,a0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,o0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,r0=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,l0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,c0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,h0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,d0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,u0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,f0=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,p0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,m0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,g0=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,v0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,x0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,_0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,M0=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,y0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,S0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,b0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,w0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,T0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,E0=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,C0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,A0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,R0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,P0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,k0=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,I0=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,L0=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,D0=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,B0=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,N0=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,U0=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,z0=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,F0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,O0=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,H0=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,G0=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,V0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,$0=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,W0=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,X0=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,q0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,K0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Y0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Z0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const j0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,J0=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Q0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,tg=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,eg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ng=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ig=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,sg=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,ag=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,og=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,rg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,lg=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,hg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,dg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,ug=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,fg=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,pg=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,mg=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,gg=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,xg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,_g=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Mg=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yg=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Sg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,wg=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Tg=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Eg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Cg=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ag=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Rg=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Pg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,oe={alphahash_fragment:Jp,alphahash_pars_fragment:Qp,alphamap_fragment:tm,alphamap_pars_fragment:em,alphatest_fragment:nm,alphatest_pars_fragment:im,aomap_fragment:sm,aomap_pars_fragment:am,batching_pars_vertex:om,batching_vertex:rm,begin_vertex:lm,beginnormal_vertex:cm,bsdfs:hm,iridescence_fragment:dm,bumpmap_pars_fragment:um,clipping_planes_fragment:fm,clipping_planes_pars_fragment:pm,clipping_planes_pars_vertex:mm,clipping_planes_vertex:gm,color_fragment:vm,color_pars_fragment:xm,color_pars_vertex:_m,color_vertex:Mm,common:ym,cube_uv_reflection_fragment:Sm,defaultnormal_vertex:bm,displacementmap_pars_vertex:wm,displacementmap_vertex:Tm,emissivemap_fragment:Em,emissivemap_pars_fragment:Cm,colorspace_fragment:Am,colorspace_pars_fragment:Rm,envmap_fragment:Pm,envmap_common_pars_fragment:km,envmap_pars_fragment:Im,envmap_pars_vertex:Lm,envmap_physical_pars_fragment:$m,envmap_vertex:Dm,fog_vertex:Bm,fog_pars_vertex:Nm,fog_fragment:Um,fog_pars_fragment:zm,gradientmap_pars_fragment:Fm,lightmap_pars_fragment:Om,lights_lambert_fragment:Hm,lights_lambert_pars_fragment:Gm,lights_pars_begin:Vm,lights_toon_fragment:Wm,lights_toon_pars_fragment:Xm,lights_phong_fragment:qm,lights_phong_pars_fragment:Km,lights_physical_fragment:Ym,lights_physical_pars_fragment:Zm,lights_fragment_begin:jm,lights_fragment_maps:Jm,lights_fragment_end:Qm,logdepthbuf_fragment:t0,logdepthbuf_pars_fragment:e0,logdepthbuf_pars_vertex:n0,logdepthbuf_vertex:i0,map_fragment:s0,map_pars_fragment:a0,map_particle_fragment:o0,map_particle_pars_fragment:r0,metalnessmap_fragment:l0,metalnessmap_pars_fragment:c0,morphinstance_vertex:h0,morphcolor_vertex:d0,morphnormal_vertex:u0,morphtarget_pars_vertex:f0,morphtarget_vertex:p0,normal_fragment_begin:m0,normal_fragment_maps:g0,normal_pars_fragment:v0,normal_pars_vertex:x0,normal_vertex:_0,normalmap_pars_fragment:M0,clearcoat_normal_fragment_begin:y0,clearcoat_normal_fragment_maps:S0,clearcoat_pars_fragment:b0,iridescence_pars_fragment:w0,opaque_fragment:T0,packing:E0,premultiplied_alpha_fragment:C0,project_vertex:A0,dithering_fragment:R0,dithering_pars_fragment:P0,roughnessmap_fragment:k0,roughnessmap_pars_fragment:I0,shadowmap_pars_fragment:L0,shadowmap_pars_vertex:D0,shadowmap_vertex:B0,shadowmask_pars_fragment:N0,skinbase_vertex:U0,skinning_pars_vertex:z0,skinning_vertex:F0,skinnormal_vertex:O0,specularmap_fragment:H0,specularmap_pars_fragment:G0,tonemapping_fragment:V0,tonemapping_pars_fragment:$0,transmission_fragment:W0,transmission_pars_fragment:X0,uv_pars_fragment:q0,uv_pars_vertex:K0,uv_vertex:Y0,worldpos_vertex:Z0,background_vert:j0,background_frag:J0,backgroundCube_vert:Q0,backgroundCube_frag:tg,cube_vert:eg,cube_frag:ng,depth_vert:ig,depth_frag:sg,distanceRGBA_vert:ag,distanceRGBA_frag:og,equirect_vert:rg,equirect_frag:lg,linedashed_vert:cg,linedashed_frag:hg,meshbasic_vert:dg,meshbasic_frag:ug,meshlambert_vert:fg,meshlambert_frag:pg,meshmatcap_vert:mg,meshmatcap_frag:gg,meshnormal_vert:vg,meshnormal_frag:xg,meshphong_vert:_g,meshphong_frag:Mg,meshphysical_vert:yg,meshphysical_frag:Sg,meshtoon_vert:bg,meshtoon_frag:wg,points_vert:Tg,points_frag:Eg,shadow_vert:Cg,shadow_frag:Ag,sprite_vert:Rg,sprite_frag:Pg},yt={common:{diffuse:{value:new Tt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new se},alphaMap:{value:null},alphaMapTransform:{value:new se},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new se}},envmap:{envMap:{value:null},envMapRotation:{value:new se},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new se}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new se}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new se},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new se},normalScale:{value:new ft(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new se},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new se}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new se}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new se}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Tt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Tt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new se},alphaTest:{value:0},uvTransform:{value:new se}},sprite:{diffuse:{value:new Tt(16777215)},opacity:{value:1},center:{value:new ft(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new se},alphaMap:{value:null},alphaMapTransform:{value:new se},alphaTest:{value:0}}},zn={basic:{uniforms:en([yt.common,yt.specularmap,yt.envmap,yt.aomap,yt.lightmap,yt.fog]),vertexShader:oe.meshbasic_vert,fragmentShader:oe.meshbasic_frag},lambert:{uniforms:en([yt.common,yt.specularmap,yt.envmap,yt.aomap,yt.lightmap,yt.emissivemap,yt.bumpmap,yt.normalmap,yt.displacementmap,yt.fog,yt.lights,{emissive:{value:new Tt(0)}}]),vertexShader:oe.meshlambert_vert,fragmentShader:oe.meshlambert_frag},phong:{uniforms:en([yt.common,yt.specularmap,yt.envmap,yt.aomap,yt.lightmap,yt.emissivemap,yt.bumpmap,yt.normalmap,yt.displacementmap,yt.fog,yt.lights,{emissive:{value:new Tt(0)},specular:{value:new Tt(1118481)},shininess:{value:30}}]),vertexShader:oe.meshphong_vert,fragmentShader:oe.meshphong_frag},standard:{uniforms:en([yt.common,yt.envmap,yt.aomap,yt.lightmap,yt.emissivemap,yt.bumpmap,yt.normalmap,yt.displacementmap,yt.roughnessmap,yt.metalnessmap,yt.fog,yt.lights,{emissive:{value:new Tt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:oe.meshphysical_vert,fragmentShader:oe.meshphysical_frag},toon:{uniforms:en([yt.common,yt.aomap,yt.lightmap,yt.emissivemap,yt.bumpmap,yt.normalmap,yt.displacementmap,yt.gradientmap,yt.fog,yt.lights,{emissive:{value:new Tt(0)}}]),vertexShader:oe.meshtoon_vert,fragmentShader:oe.meshtoon_frag},matcap:{uniforms:en([yt.common,yt.bumpmap,yt.normalmap,yt.displacementmap,yt.fog,{matcap:{value:null}}]),vertexShader:oe.meshmatcap_vert,fragmentShader:oe.meshmatcap_frag},points:{uniforms:en([yt.points,yt.fog]),vertexShader:oe.points_vert,fragmentShader:oe.points_frag},dashed:{uniforms:en([yt.common,yt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:oe.linedashed_vert,fragmentShader:oe.linedashed_frag},depth:{uniforms:en([yt.common,yt.displacementmap]),vertexShader:oe.depth_vert,fragmentShader:oe.depth_frag},normal:{uniforms:en([yt.common,yt.bumpmap,yt.normalmap,yt.displacementmap,{opacity:{value:1}}]),vertexShader:oe.meshnormal_vert,fragmentShader:oe.meshnormal_frag},sprite:{uniforms:en([yt.sprite,yt.fog]),vertexShader:oe.sprite_vert,fragmentShader:oe.sprite_frag},background:{uniforms:{uvTransform:{value:new se},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:oe.background_vert,fragmentShader:oe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new se}},vertexShader:oe.backgroundCube_vert,fragmentShader:oe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:oe.cube_vert,fragmentShader:oe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:oe.equirect_vert,fragmentShader:oe.equirect_frag},distanceRGBA:{uniforms:en([yt.common,yt.displacementmap,{referencePosition:{value:new G},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:oe.distanceRGBA_vert,fragmentShader:oe.distanceRGBA_frag},shadow:{uniforms:en([yt.lights,yt.fog,{color:{value:new Tt(0)},opacity:{value:1}}]),vertexShader:oe.shadow_vert,fragmentShader:oe.shadow_frag}};zn.physical={uniforms:en([zn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new se},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new se},clearcoatNormalScale:{value:new ft(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new se},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new se},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new se},sheen:{value:0},sheenColor:{value:new Tt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new se},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new se},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new se},transmissionSamplerSize:{value:new ft},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new se},attenuationDistance:{value:0},attenuationColor:{value:new Tt(0)},specularColor:{value:new Tt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new se},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new se},anisotropyVector:{value:new ft},anisotropyMap:{value:null},anisotropyMapTransform:{value:new se}}]),vertexShader:oe.meshphysical_vert,fragmentShader:oe.meshphysical_frag};const ho={r:0,b:0,g:0},Hi=new Kn,kg=new _e;function Ig(i,t,e,n,s,a,o){const r=new Tt(0);let l=a===!0?0:1,c,d,u=null,f=0,m=null;function p(b){let w=b.isScene===!0?b.background:null;return w&&w.isTexture&&(w=(b.backgroundBlurriness>0?e:t).get(w)),w}function S(b){let w=!1;const y=p(b);y===null?h(r,l):y&&y.isColor&&(h(y,1),w=!0);const C=i.xr.getEnvironmentBlendMode();C==="additive"?n.buffers.color.setClear(0,0,0,1,o):C==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(i.autoClear||w)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function g(b,w){const y=p(w);y&&(y.isCubeTexture||y.mapping===$o)?(d===void 0&&(d=new F(new Nt(1,1,1),new Fe({name:"BackgroundCubeMaterial",uniforms:$s(zn.backgroundCube.uniforms),vertexShader:zn.backgroundCube.vertexShader,fragmentShader:zn.backgroundCube.fragmentShader,side:sn,depthTest:!1,depthWrite:!1,fog:!1})),d.geometry.deleteAttribute("normal"),d.geometry.deleteAttribute("uv"),d.onBeforeRender=function(C,v,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(d.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(d)),Hi.copy(w.backgroundRotation),Hi.x*=-1,Hi.y*=-1,Hi.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(Hi.y*=-1,Hi.z*=-1),d.material.uniforms.envMap.value=y,d.material.uniforms.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,d.material.uniforms.backgroundBlurriness.value=w.backgroundBlurriness,d.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,d.material.uniforms.backgroundRotation.value.setFromMatrix4(kg.makeRotationFromEuler(Hi)),d.material.toneMapped=de.getTransfer(y.colorSpace)!==ye,(u!==y||f!==y.version||m!==i.toneMapping)&&(d.material.needsUpdate=!0,u=y,f=y.version,m=i.toneMapping),d.layers.enableAll(),b.unshift(d,d.geometry,d.material,0,0,null)):y&&y.isTexture&&(c===void 0&&(c=new F(new Xe(2,2),new Fe({name:"BackgroundMaterial",uniforms:$s(zn.background.uniforms),vertexShader:zn.background.vertexShader,fragmentShader:zn.background.fragmentShader,side:Di,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=y,c.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,c.material.toneMapped=de.getTransfer(y.colorSpace)!==ye,y.matrixAutoUpdate===!0&&y.updateMatrix(),c.material.uniforms.uvTransform.value.copy(y.matrix),(u!==y||f!==y.version||m!==i.toneMapping)&&(c.material.needsUpdate=!0,u=y,f=y.version,m=i.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null))}function h(b,w){b.getRGB(ho,Uu(i)),n.buffers.color.setClear(ho.r,ho.g,ho.b,w,o)}return{getClearColor:function(){return r},setClearColor:function(b,w=1){r.set(b),l=w,h(r,l)},getClearAlpha:function(){return l},setClearAlpha:function(b){l=b,h(r,l)},render:S,addToRenderList:g}}function Lg(i,t){const e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=f(null);let a=s,o=!1;function r(M,_,N,U,H){let z=!1;const L=u(U,N,_);a!==L&&(a=L,c(a.object)),z=m(M,U,N,H),z&&p(M,U,N,H),H!==null&&t.update(H,i.ELEMENT_ARRAY_BUFFER),(z||o)&&(o=!1,y(M,_,N,U),H!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(H).buffer))}function l(){return i.createVertexArray()}function c(M){return i.bindVertexArray(M)}function d(M){return i.deleteVertexArray(M)}function u(M,_,N){const U=N.wireframe===!0;let H=n[M.id];H===void 0&&(H={},n[M.id]=H);let z=H[_.id];z===void 0&&(z={},H[_.id]=z);let L=z[U];return L===void 0&&(L=f(l()),z[U]=L),L}function f(M){const _=[],N=[],U=[];for(let H=0;H<e;H++)_[H]=0,N[H]=0,U[H]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:_,enabledAttributes:N,attributeDivisors:U,object:M,attributes:{},index:null}}function m(M,_,N,U){const H=a.attributes,z=_.attributes;let L=0;const A=N.getAttributes();for(const E in A)if(A[E].location>=0){const V=H[E];let $=z[E];if($===void 0&&(E==="instanceMatrix"&&M.instanceMatrix&&($=M.instanceMatrix),E==="instanceColor"&&M.instanceColor&&($=M.instanceColor)),V===void 0||V.attribute!==$||$&&V.data!==$.data)return!0;L++}return a.attributesNum!==L||a.index!==U}function p(M,_,N,U){const H={},z=_.attributes;let L=0;const A=N.getAttributes();for(const E in A)if(A[E].location>=0){let V=z[E];V===void 0&&(E==="instanceMatrix"&&M.instanceMatrix&&(V=M.instanceMatrix),E==="instanceColor"&&M.instanceColor&&(V=M.instanceColor));const $={};$.attribute=V,V&&V.data&&($.data=V.data),H[E]=$,L++}a.attributes=H,a.attributesNum=L,a.index=U}function S(){const M=a.newAttributes;for(let _=0,N=M.length;_<N;_++)M[_]=0}function g(M){h(M,0)}function h(M,_){const N=a.newAttributes,U=a.enabledAttributes,H=a.attributeDivisors;N[M]=1,U[M]===0&&(i.enableVertexAttribArray(M),U[M]=1),H[M]!==_&&(i.vertexAttribDivisor(M,_),H[M]=_)}function b(){const M=a.newAttributes,_=a.enabledAttributes;for(let N=0,U=_.length;N<U;N++)_[N]!==M[N]&&(i.disableVertexAttribArray(N),_[N]=0)}function w(M,_,N,U,H,z,L){L===!0?i.vertexAttribIPointer(M,_,N,H,z):i.vertexAttribPointer(M,_,N,U,H,z)}function y(M,_,N,U){S();const H=U.attributes,z=N.getAttributes(),L=_.defaultAttributeValues;for(const A in z){const E=z[A];if(E.location>=0){let I=H[A];if(I===void 0&&(A==="instanceMatrix"&&M.instanceMatrix&&(I=M.instanceMatrix),A==="instanceColor"&&M.instanceColor&&(I=M.instanceColor)),I!==void 0){const V=I.normalized,$=I.itemSize,Q=t.get(I);if(Q===void 0)continue;const it=Q.buffer,W=Q.type,j=Q.bytesPerElement,ht=W===i.INT||W===i.UNSIGNED_INT||I.gpuType===sc;if(I.isInterleavedBufferAttribute){const dt=I.data,Rt=dt.stride,Pt=I.offset;if(dt.isInstancedInterleavedBuffer){for(let kt=0;kt<E.locationSize;kt++)h(E.location+kt,dt.meshPerAttribute);M.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=dt.meshPerAttribute*dt.count)}else for(let kt=0;kt<E.locationSize;kt++)g(E.location+kt);i.bindBuffer(i.ARRAY_BUFFER,it);for(let kt=0;kt<E.locationSize;kt++)w(E.location+kt,$/E.locationSize,W,V,Rt*j,(Pt+$/E.locationSize*kt)*j,ht)}else{if(I.isInstancedBufferAttribute){for(let dt=0;dt<E.locationSize;dt++)h(E.location+dt,I.meshPerAttribute);M.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=I.meshPerAttribute*I.count)}else for(let dt=0;dt<E.locationSize;dt++)g(E.location+dt);i.bindBuffer(i.ARRAY_BUFFER,it);for(let dt=0;dt<E.locationSize;dt++)w(E.location+dt,$/E.locationSize,W,V,$*j,$/E.locationSize*dt*j,ht)}}else if(L!==void 0){const V=L[A];if(V!==void 0)switch(V.length){case 2:i.vertexAttrib2fv(E.location,V);break;case 3:i.vertexAttrib3fv(E.location,V);break;case 4:i.vertexAttrib4fv(E.location,V);break;default:i.vertexAttrib1fv(E.location,V)}}}}b()}function C(){P();for(const M in n){const _=n[M];for(const N in _){const U=_[N];for(const H in U)d(U[H].object),delete U[H];delete _[N]}delete n[M]}}function v(M){if(n[M.id]===void 0)return;const _=n[M.id];for(const N in _){const U=_[N];for(const H in U)d(U[H].object),delete U[H];delete _[N]}delete n[M.id]}function T(M){for(const _ in n){const N=n[_];if(N[M.id]===void 0)continue;const U=N[M.id];for(const H in U)d(U[H].object),delete U[H];delete N[M.id]}}function P(){x(),o=!0,a!==s&&(a=s,c(a.object))}function x(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:r,reset:P,resetDefaultState:x,dispose:C,releaseStatesOfGeometry:v,releaseStatesOfProgram:T,initAttributes:S,enableAttribute:g,disableUnusedAttributes:b}}function Dg(i,t,e){let n;function s(c){n=c}function a(c,d){i.drawArrays(n,c,d),e.update(d,n,1)}function o(c,d,u){u!==0&&(i.drawArraysInstanced(n,c,d,u),e.update(d,n,u))}function r(c,d,u){if(u===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,d,0,u);let m=0;for(let p=0;p<u;p++)m+=d[p];e.update(m,n,1)}function l(c,d,u,f){if(u===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<c.length;p++)o(c[p],d[p],f[p]);else{m.multiDrawArraysInstancedWEBGL(n,c,0,d,0,f,0,u);let p=0;for(let S=0;S<u;S++)p+=d[S]*f[S];e.update(p,n,1)}}this.setMode=s,this.render=a,this.renderInstances=o,this.renderMultiDraw=r,this.renderMultiDrawInstances=l}function Bg(i,t,e,n){let s;function a(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const T=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(T.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(T){return!(T!==Pn&&n.convert(T)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function r(T){const P=T===ci&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(T!==ui&&n.convert(T)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&T!==Gn&&!P)}function l(T){if(T==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";T="mediump"}return T==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const d=l(c);d!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",d,"instead."),c=d);const u=e.logarithmicDepthBuffer===!0,f=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),m=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),p=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),S=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),h=i.getParameter(i.MAX_VERTEX_ATTRIBS),b=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),w=i.getParameter(i.MAX_VARYING_VECTORS),y=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),C=p>0,v=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:r,precision:c,logarithmicDepthBuffer:u,reverseDepthBuffer:f,maxTextures:m,maxVertexTextures:p,maxTextureSize:S,maxCubemapSize:g,maxAttributes:h,maxVertexUniforms:b,maxVaryings:w,maxFragmentUniforms:y,vertexTextures:C,maxSamples:v}}function Ng(i){const t=this;let e=null,n=0,s=!1,a=!1;const o=new wi,r=new se,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){const m=u.length!==0||f||n!==0||s;return s=f,n=u.length,m},this.beginShadows=function(){a=!0,d(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(u,f){e=d(u,f,0)},this.setState=function(u,f,m){const p=u.clippingPlanes,S=u.clipIntersection,g=u.clipShadows,h=i.get(u);if(!s||p===null||p.length===0||a&&!g)a?d(null):c();else{const b=a?0:n,w=b*4;let y=h.clippingState||null;l.value=y,y=d(p,f,w,m);for(let C=0;C!==w;++C)y[C]=e[C];h.clippingState=y,this.numIntersection=S?this.numPlanes:0,this.numPlanes+=b}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function d(u,f,m,p){const S=u!==null?u.length:0;let g=null;if(S!==0){if(g=l.value,p!==!0||g===null){const h=m+S*4,b=f.matrixWorldInverse;r.getNormalMatrix(b),(g===null||g.length<h)&&(g=new Float32Array(h));for(let w=0,y=m;w!==S;++w,y+=4)o.copy(u[w]).applyMatrix4(b,r),o.normal.toArray(g,y),g[y+3]=o.constant}l.value=g,l.needsUpdate=!0}return t.numPlanes=S,t.numIntersection=0,g}}function Ug(i){let t=new WeakMap;function e(o,r){return r===cl?o.mapping=Os:r===hl&&(o.mapping=Hs),o}function n(o){if(o&&o.isTexture){const r=o.mapping;if(r===cl||r===hl)if(t.has(o)){const l=t.get(o).texture;return e(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new Kp(l.height);return c.fromEquirectangularTexture(i,o),t.set(o,c),o.addEventListener("dispose",s),e(c.texture,o.mapping)}else return null}}return o}function s(o){const r=o.target;r.removeEventListener("dispose",s);const l=t.get(r);l!==void 0&&(t.delete(r),l.dispose())}function a(){t=new WeakMap}return{get:n,dispose:a}}class mc extends zu{constructor(t=-1,e=1,n=1,s=-1,a=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=a,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,a,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=a,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let a=n-t,o=n+t,r=s+e,l=s-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,d=(this.top-this.bottom)/this.view.fullHeight/this.zoom;a+=c*this.view.offsetX,o=a+c*this.view.width,r-=d*this.view.offsetY,l=r-d*this.view.height}this.projectionMatrix.makeOrthographic(a,o,r,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const ks=4,hh=[.125,.215,.35,.446,.526,.582],qi=20,Mr=new mc,dh=new Tt;let yr=null,Sr=0,br=0,wr=!1;const Wi=(1+Math.sqrt(5))/2,ws=1/Wi,uh=[new G(-Wi,ws,0),new G(Wi,ws,0),new G(-ws,0,Wi),new G(ws,0,Wi),new G(0,Wi,-ws),new G(0,Wi,ws),new G(-1,1,-1),new G(1,1,-1),new G(-1,1,1),new G(1,1,1)];class zl{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,s=100){yr=this._renderer.getRenderTarget(),Sr=this._renderer.getActiveCubeFace(),br=this._renderer.getActiveMipmapLevel(),wr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const a=this._allocateTargets();return a.depthBuffer=!0,this._sceneToCubeUV(t,n,s,a),e>0&&this._blur(a,0,0,e),this._applyPMREM(a),this._cleanup(a),a}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=mh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=ph(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(yr,Sr,br),this._renderer.xr.enabled=wr,t.scissorTest=!1,uo(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Os||t.mapping===Hs?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),yr=this._renderer.getRenderTarget(),Sr=this._renderer.getActiveCubeFace(),br=this._renderer.getActiveMipmapLevel(),wr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:Hn,minFilter:Hn,generateMipmaps:!1,type:ci,format:Pn,colorSpace:Zs,depthBuffer:!1},s=fh(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=fh(t,e,n);const{_lodMax:a}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=zg(a)),this._blurMaterial=Fg(a,t,e)}return s}_compileMaterial(t){const e=new F(this._lodPlanes[0],t);this._renderer.compile(e,Mr)}_sceneToCubeUV(t,e,n,s){const r=new pn(90,1,e,n),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(dh),d.toneMapping=Ai,d.autoClear=!1;const m=new le({name:"PMREM.Background",side:sn,depthWrite:!1,depthTest:!1}),p=new F(new Nt,m);let S=!1;const g=t.background;g?g.isColor&&(m.color.copy(g),t.background=null,S=!0):(m.color.copy(dh),S=!0);for(let h=0;h<6;h++){const b=h%3;b===0?(r.up.set(0,l[h],0),r.lookAt(c[h],0,0)):b===1?(r.up.set(0,0,l[h]),r.lookAt(0,c[h],0)):(r.up.set(0,l[h],0),r.lookAt(0,0,c[h]));const w=this._cubeSize;uo(s,b*w,h>2?w:0,w,w),d.setRenderTarget(s),S&&d.render(p,r),d.render(t,r)}p.geometry.dispose(),p.material.dispose(),d.toneMapping=f,d.autoClear=u,t.background=g}_textureToCubeUV(t,e){const n=this._renderer,s=t.mapping===Os||t.mapping===Hs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=mh()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=ph());const a=s?this._cubemapMaterial:this._equirectMaterial,o=new F(this._lodPlanes[0],a),r=a.uniforms;r.envMap.value=t;const l=this._cubeSize;uo(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,Mr)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const s=this._lodPlanes.length;for(let a=1;a<s;a++){const o=Math.sqrt(this._sigmas[a]*this._sigmas[a]-this._sigmas[a-1]*this._sigmas[a-1]),r=uh[(s-a-1)%uh.length];this._blur(t,a-1,a,o,r)}e.autoClear=n}_blur(t,e,n,s,a){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,n,s,"latitudinal",a),this._halfBlur(o,t,n,n,s,"longitudinal",a)}_halfBlur(t,e,n,s,a,o,r){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const d=3,u=new F(this._lodPlanes[s],c),f=c.uniforms,m=this._sizeLods[n]-1,p=isFinite(a)?Math.PI/(2*m):2*Math.PI/(2*qi-1),S=a/p,g=isFinite(a)?1+Math.floor(d*S):qi;g>qi&&console.warn(`sigmaRadians, ${a}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${qi}`);const h=[];let b=0;for(let T=0;T<qi;++T){const P=T/S,x=Math.exp(-P*P/2);h.push(x),T===0?b+=x:T<g&&(b+=2*x)}for(let T=0;T<h.length;T++)h[T]=h[T]/b;f.envMap.value=t.texture,f.samples.value=g,f.weights.value=h,f.latitudinal.value=o==="latitudinal",r&&(f.poleAxis.value=r);const{_lodMax:w}=this;f.dTheta.value=p,f.mipInt.value=w-n;const y=this._sizeLods[s],C=3*y*(s>w-ks?s-w+ks:0),v=4*(this._cubeSize-y);uo(e,C,v,3*y,2*y),l.setRenderTarget(e),l.render(u,Mr)}}function zg(i){const t=[],e=[],n=[];let s=i;const a=i-ks+1+hh.length;for(let o=0;o<a;o++){const r=Math.pow(2,s);e.push(r);let l=1/r;o>i-ks?l=hh[o-i+ks-1]:o===0&&(l=0),n.push(l);const c=1/(r-2),d=-c,u=1+c,f=[d,d,u,d,u,u,d,d,u,u,d,u],m=6,p=6,S=3,g=2,h=1,b=new Float32Array(S*p*m),w=new Float32Array(g*p*m),y=new Float32Array(h*p*m);for(let v=0;v<m;v++){const T=v%3*2/3-1,P=v>2?0:-1,x=[T,P,0,T+2/3,P,0,T+2/3,P+1,0,T,P,0,T+2/3,P+1,0,T,P+1,0];b.set(x,S*p*v),w.set(f,g*p*v);const M=[v,v,v,v,v,v];y.set(M,h*p*v)}const C=new Ue;C.setAttribute("position",new Le(b,S)),C.setAttribute("uv",new Le(w,g)),C.setAttribute("faceIndex",new Le(y,h)),t.push(C),s>ks&&s--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function fh(i,t,e){const n=new kn(i,t,e);return n.texture.mapping=$o,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function uo(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function Fg(i,t,e){const n=new Float32Array(qi),s=new G(0,1,0);return new Fe({name:"SphericalGaussianBlur",defines:{n:qi,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:gc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:li,depthTest:!1,depthWrite:!1})}function ph(){return new Fe({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:gc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:li,depthTest:!1,depthWrite:!1})}function mh(){return new Fe({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:gc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:li,depthTest:!1,depthWrite:!1})}function gc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Og(i){let t=new WeakMap,e=null;function n(r){if(r&&r.isTexture){const l=r.mapping,c=l===cl||l===hl,d=l===Os||l===Hs;if(c||d){let u=t.get(r);const f=u!==void 0?u.texture.pmremVersion:0;if(r.isRenderTargetTexture&&r.pmremVersion!==f)return e===null&&(e=new zl(i)),u=c?e.fromEquirectangular(r,u):e.fromCubemap(r,u),u.texture.pmremVersion=r.pmremVersion,t.set(r,u),u.texture;if(u!==void 0)return u.texture;{const m=r.image;return c&&m&&m.height>0||d&&m&&s(m)?(e===null&&(e=new zl(i)),u=c?e.fromEquirectangular(r):e.fromCubemap(r),u.texture.pmremVersion=r.pmremVersion,t.set(r,u),r.addEventListener("dispose",a),u.texture):null}}}return r}function s(r){let l=0;const c=6;for(let d=0;d<c;d++)r[d]!==void 0&&l++;return l===c}function a(r){const l=r.target;l.removeEventListener("dispose",a);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:o}}function Hg(i){const t={};function e(n){if(t[n]!==void 0)return t[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const s=e(n);return s===null&&ga("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function Gg(i,t,e,n){const s={},a=new WeakMap;function o(u){const f=u.target;f.index!==null&&t.remove(f.index);for(const p in f.attributes)t.remove(f.attributes[p]);for(const p in f.morphAttributes){const S=f.morphAttributes[p];for(let g=0,h=S.length;g<h;g++)t.remove(S[g])}f.removeEventListener("dispose",o),delete s[f.id];const m=a.get(f);m&&(t.remove(m),a.delete(f)),n.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,e.memory.geometries--}function r(u,f){return s[f.id]===!0||(f.addEventListener("dispose",o),s[f.id]=!0,e.memory.geometries++),f}function l(u){const f=u.attributes;for(const p in f)t.update(f[p],i.ARRAY_BUFFER);const m=u.morphAttributes;for(const p in m){const S=m[p];for(let g=0,h=S.length;g<h;g++)t.update(S[g],i.ARRAY_BUFFER)}}function c(u){const f=[],m=u.index,p=u.attributes.position;let S=0;if(m!==null){const b=m.array;S=m.version;for(let w=0,y=b.length;w<y;w+=3){const C=b[w+0],v=b[w+1],T=b[w+2];f.push(C,v,v,T,T,C)}}else if(p!==void 0){const b=p.array;S=p.version;for(let w=0,y=b.length/3-1;w<y;w+=3){const C=w+0,v=w+1,T=w+2;f.push(C,v,v,T,T,C)}}else return;const g=new(ku(f)?Nu:Bu)(f,1);g.version=S;const h=a.get(u);h&&t.remove(h),a.set(u,g)}function d(u){const f=a.get(u);if(f){const m=u.index;m!==null&&f.version<m.version&&c(u)}else c(u);return a.get(u)}return{get:r,update:l,getWireframeAttribute:d}}function Vg(i,t,e){let n;function s(f){n=f}let a,o;function r(f){a=f.type,o=f.bytesPerElement}function l(f,m){i.drawElements(n,m,a,f*o),e.update(m,n,1)}function c(f,m,p){p!==0&&(i.drawElementsInstanced(n,m,a,f*o,p),e.update(m,n,p))}function d(f,m,p){if(p===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,m,0,a,f,0,p);let g=0;for(let h=0;h<p;h++)g+=m[h];e.update(g,n,1)}function u(f,m,p,S){if(p===0)return;const g=t.get("WEBGL_multi_draw");if(g===null)for(let h=0;h<f.length;h++)c(f[h]/o,m[h],S[h]);else{g.multiDrawElementsInstancedWEBGL(n,m,0,a,f,0,S,0,p);let h=0;for(let b=0;b<p;b++)h+=m[b]*S[b];e.update(h,n,1)}}this.setMode=s,this.setIndex=r,this.render=l,this.renderInstances=c,this.renderMultiDraw=d,this.renderMultiDrawInstances=u}function $g(i){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(a,o,r){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=r*(a/3);break;case i.LINES:e.lines+=r*(a/2);break;case i.LINE_STRIP:e.lines+=r*(a-1);break;case i.LINE_LOOP:e.lines+=r*a;break;case i.POINTS:e.points+=r*a;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function Wg(i,t,e){const n=new WeakMap,s=new be;function a(o,r,l){const c=o.morphTargetInfluences,d=r.morphAttributes.position||r.morphAttributes.normal||r.morphAttributes.color,u=d!==void 0?d.length:0;let f=n.get(r);if(f===void 0||f.count!==u){let M=function(){P.dispose(),n.delete(r),r.removeEventListener("dispose",M)};var m=M;f!==void 0&&f.texture.dispose();const p=r.morphAttributes.position!==void 0,S=r.morphAttributes.normal!==void 0,g=r.morphAttributes.color!==void 0,h=r.morphAttributes.position||[],b=r.morphAttributes.normal||[],w=r.morphAttributes.color||[];let y=0;p===!0&&(y=1),S===!0&&(y=2),g===!0&&(y=3);let C=r.attributes.position.count*y,v=1;C>t.maxTextureSize&&(v=Math.ceil(C/t.maxTextureSize),C=t.maxTextureSize);const T=new Float32Array(C*v*4*u),P=new Lu(T,C,v,u);P.type=Gn,P.needsUpdate=!0;const x=y*4;for(let _=0;_<u;_++){const N=h[_],U=b[_],H=w[_],z=C*v*4*_;for(let L=0;L<N.count;L++){const A=L*x;p===!0&&(s.fromBufferAttribute(N,L),T[z+A+0]=s.x,T[z+A+1]=s.y,T[z+A+2]=s.z,T[z+A+3]=0),S===!0&&(s.fromBufferAttribute(U,L),T[z+A+4]=s.x,T[z+A+5]=s.y,T[z+A+6]=s.z,T[z+A+7]=0),g===!0&&(s.fromBufferAttribute(H,L),T[z+A+8]=s.x,T[z+A+9]=s.y,T[z+A+10]=s.z,T[z+A+11]=H.itemSize===4?s.w:1)}}f={count:u,texture:P,size:new ft(C,v)},n.set(r,f),r.addEventListener("dispose",M)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let p=0;for(let g=0;g<c.length;g++)p+=c[g];const S=r.morphTargetsRelative?1:1-p;l.getUniforms().setValue(i,"morphTargetBaseInfluence",S),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",f.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",f.size)}return{update:a}}function Xg(i,t,e,n){let s=new WeakMap;function a(l){const c=n.render.frame,d=l.geometry,u=t.get(l,d);if(s.get(u)!==c&&(t.update(u),s.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",r)===!1&&l.addEventListener("dispose",r),s.get(l)!==c&&(e.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const f=l.skeleton;s.get(f)!==c&&(f.update(),s.set(f,c))}return u}function o(){s=new WeakMap}function r(l){const c=l.target;c.removeEventListener("dispose",r),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:a,dispose:o}}class Hu extends Je{constructor(t,e,n,s,a,o,r,l,c,d=Bs){if(d!==Bs&&d!==Vs)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&d===Bs&&(n=ns),n===void 0&&d===Vs&&(n=Gs),super(null,s,a,o,r,l,d,n,c),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=r!==void 0?r:mn,this.minFilter=l!==void 0?l:mn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const Gu=new Je,gh=new Hu(1,1),Vu=new Lu,$u=new Lp,Wu=new Fu,vh=[],xh=[],_h=new Float32Array(16),Mh=new Float32Array(9),yh=new Float32Array(4);function ta(i,t,e){const n=i[0];if(n<=0||n>0)return i;const s=t*e;let a=vh[s];if(a===void 0&&(a=new Float32Array(s),vh[s]=a),t!==0){n.toArray(a,0);for(let o=1,r=0;o!==t;++o)r+=e,i[o].toArray(a,r)}return a}function He(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Ge(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function Xo(i,t){let e=xh[t];e===void 0&&(e=new Int32Array(t),xh[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function qg(i,t){const e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function Kg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(He(e,t))return;i.uniform2fv(this.addr,t),Ge(e,t)}}function Yg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(He(e,t))return;i.uniform3fv(this.addr,t),Ge(e,t)}}function Zg(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(He(e,t))return;i.uniform4fv(this.addr,t),Ge(e,t)}}function jg(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(He(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Ge(e,t)}else{if(He(e,n))return;yh.set(n),i.uniformMatrix2fv(this.addr,!1,yh),Ge(e,n)}}function Jg(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(He(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Ge(e,t)}else{if(He(e,n))return;Mh.set(n),i.uniformMatrix3fv(this.addr,!1,Mh),Ge(e,n)}}function Qg(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(He(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Ge(e,t)}else{if(He(e,n))return;_h.set(n),i.uniformMatrix4fv(this.addr,!1,_h),Ge(e,n)}}function t1(i,t){const e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function e1(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(He(e,t))return;i.uniform2iv(this.addr,t),Ge(e,t)}}function n1(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(He(e,t))return;i.uniform3iv(this.addr,t),Ge(e,t)}}function i1(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(He(e,t))return;i.uniform4iv(this.addr,t),Ge(e,t)}}function s1(i,t){const e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function a1(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(He(e,t))return;i.uniform2uiv(this.addr,t),Ge(e,t)}}function o1(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(He(e,t))return;i.uniform3uiv(this.addr,t),Ge(e,t)}}function r1(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(He(e,t))return;i.uniform4uiv(this.addr,t),Ge(e,t)}}function l1(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let a;this.type===i.SAMPLER_2D_SHADOW?(gh.compareFunction=Pu,a=gh):a=Gu,e.setTexture2D(t||a,s)}function c1(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||$u,s)}function h1(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||Wu,s)}function d1(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||Vu,s)}function u1(i){switch(i){case 5126:return qg;case 35664:return Kg;case 35665:return Yg;case 35666:return Zg;case 35674:return jg;case 35675:return Jg;case 35676:return Qg;case 5124:case 35670:return t1;case 35667:case 35671:return e1;case 35668:case 35672:return n1;case 35669:case 35673:return i1;case 5125:return s1;case 36294:return a1;case 36295:return o1;case 36296:return r1;case 35678:case 36198:case 36298:case 36306:case 35682:return l1;case 35679:case 36299:case 36307:return c1;case 35680:case 36300:case 36308:case 36293:return h1;case 36289:case 36303:case 36311:case 36292:return d1}}function f1(i,t){i.uniform1fv(this.addr,t)}function p1(i,t){const e=ta(t,this.size,2);i.uniform2fv(this.addr,e)}function m1(i,t){const e=ta(t,this.size,3);i.uniform3fv(this.addr,e)}function g1(i,t){const e=ta(t,this.size,4);i.uniform4fv(this.addr,e)}function v1(i,t){const e=ta(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function x1(i,t){const e=ta(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function _1(i,t){const e=ta(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function M1(i,t){i.uniform1iv(this.addr,t)}function y1(i,t){i.uniform2iv(this.addr,t)}function S1(i,t){i.uniform3iv(this.addr,t)}function b1(i,t){i.uniform4iv(this.addr,t)}function w1(i,t){i.uniform1uiv(this.addr,t)}function T1(i,t){i.uniform2uiv(this.addr,t)}function E1(i,t){i.uniform3uiv(this.addr,t)}function C1(i,t){i.uniform4uiv(this.addr,t)}function A1(i,t,e){const n=this.cache,s=t.length,a=Xo(e,s);He(n,a)||(i.uniform1iv(this.addr,a),Ge(n,a));for(let o=0;o!==s;++o)e.setTexture2D(t[o]||Gu,a[o])}function R1(i,t,e){const n=this.cache,s=t.length,a=Xo(e,s);He(n,a)||(i.uniform1iv(this.addr,a),Ge(n,a));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||$u,a[o])}function P1(i,t,e){const n=this.cache,s=t.length,a=Xo(e,s);He(n,a)||(i.uniform1iv(this.addr,a),Ge(n,a));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||Wu,a[o])}function k1(i,t,e){const n=this.cache,s=t.length,a=Xo(e,s);He(n,a)||(i.uniform1iv(this.addr,a),Ge(n,a));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||Vu,a[o])}function I1(i){switch(i){case 5126:return f1;case 35664:return p1;case 35665:return m1;case 35666:return g1;case 35674:return v1;case 35675:return x1;case 35676:return _1;case 5124:case 35670:return M1;case 35667:case 35671:return y1;case 35668:case 35672:return S1;case 35669:case 35673:return b1;case 5125:return w1;case 36294:return T1;case 36295:return E1;case 36296:return C1;case 35678:case 36198:case 36298:case 36306:case 35682:return A1;case 35679:case 36299:case 36307:return R1;case 35680:case 36300:case 36308:case 36293:return P1;case 36289:case 36303:case 36311:case 36292:return k1}}class L1{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=u1(e.type)}}class D1{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=I1(e.type)}}class B1{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const s=this.seq;for(let a=0,o=s.length;a!==o;++a){const r=s[a];r.setValue(t,e[r.id],n)}}}const Tr=/(\w+)(\])?(\[|\.)?/g;function Sh(i,t){i.seq.push(t),i.map[t.id]=t}function N1(i,t,e){const n=i.name,s=n.length;for(Tr.lastIndex=0;;){const a=Tr.exec(n),o=Tr.lastIndex;let r=a[1];const l=a[2]==="]",c=a[3];if(l&&(r=r|0),c===void 0||c==="["&&o+2===s){Sh(e,c===void 0?new L1(r,i,t):new D1(r,i,t));break}else{let u=e.map[r];u===void 0&&(u=new B1(r),Sh(e,u)),e=u}}}class Po{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){const a=t.getActiveUniform(e,s),o=t.getUniformLocation(e,a.name);N1(a,o,this)}}setValue(t,e,n,s){const a=this.map[e];a!==void 0&&a.setValue(t,n,s)}setOptional(t,e,n){const s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let a=0,o=e.length;a!==o;++a){const r=e[a],l=n[r.id];l.needsUpdate!==!1&&r.setValue(t,l.value,s)}}static seqWithValue(t,e){const n=[];for(let s=0,a=t.length;s!==a;++s){const o=t[s];o.id in e&&n.push(o)}return n}}function bh(i,t,e){const n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}const U1=37297;let z1=0;function F1(i,t){const e=i.split(`
`),n=[],s=Math.max(t-6,0),a=Math.min(t+6,e.length);for(let o=s;o<a;o++){const r=o+1;n.push(`${r===t?">":" "} ${r}: ${e[o]}`)}return n.join(`
`)}const wh=new se;function O1(i){de._getMatrix(wh,de.workingColorSpace,i);const t=`mat3( ${wh.elements.map(e=>e.toFixed(4))} )`;switch(de.getTransfer(i)){case Wo:return[t,"LinearTransferOETF"];case ye:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function Th(i,t,e){const n=i.getShaderParameter(t,i.COMPILE_STATUS),s=i.getShaderInfoLog(t).trim();if(n&&s==="")return"";const a=/ERROR: 0:(\d+)/.exec(s);if(a){const o=parseInt(a[1]);return e.toUpperCase()+`

`+s+`

`+F1(i.getShaderSource(t),o)}else return s}function H1(i,t){const e=O1(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function G1(i,t){let e;switch(t){case pu:e="Linear";break;case mu:e="Reinhard";break;case gu:e="Cineon";break;case ic:e="ACESFilmic";break;case vu:e="AgX";break;case xu:e="Neutral";break;case jf:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const fo=new G;function V1(){de.getLuminanceCoefficients(fo);const i=fo.x.toFixed(4),t=fo.y.toFixed(4),e=fo.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function $1(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(va).join(`
`)}function W1(i){const t=[];for(const e in i){const n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function X1(i,t){const e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const a=i.getActiveAttrib(t,s),o=a.name;let r=1;a.type===i.FLOAT_MAT2&&(r=2),a.type===i.FLOAT_MAT3&&(r=3),a.type===i.FLOAT_MAT4&&(r=4),e[o]={type:a.type,location:i.getAttribLocation(t,o),locationSize:r}}return e}function va(i){return i!==""}function Eh(i,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Ch(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const q1=/^[ \t]*#include +<([\w\d./]+)>/gm;function Fl(i){return i.replace(q1,Y1)}const K1=new Map;function Y1(i,t){let e=oe[t];if(e===void 0){const n=K1.get(t);if(n!==void 0)e=oe[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return Fl(e)}const Z1=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ah(i){return i.replace(Z1,j1)}function j1(i,t,e,n){let s="";for(let a=parseInt(t);a<parseInt(e);a++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return s}function Rh(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function J1(i){let t="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===nc?t="SHADOWMAP_TYPE_PCF":i.shadowMapType===Pf?t="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===ii&&(t="SHADOWMAP_TYPE_VSM"),t}function Q1(i){let t="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case Os:case Hs:t="ENVMAP_TYPE_CUBE";break;case $o:t="ENVMAP_TYPE_CUBE_UV";break}return t}function tv(i){let t="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case Hs:t="ENVMAP_MODE_REFRACTION";break}return t}function ev(i){let t="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case fu:t="ENVMAP_BLENDING_MULTIPLY";break;case Yf:t="ENVMAP_BLENDING_MIX";break;case Zf:t="ENVMAP_BLENDING_ADD";break}return t}function nv(i){const t=i.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function iv(i,t,e,n){const s=i.getContext(),a=e.defines;let o=e.vertexShader,r=e.fragmentShader;const l=J1(e),c=Q1(e),d=tv(e),u=ev(e),f=nv(e),m=$1(e),p=W1(a),S=s.createProgram();let g,h,b=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(va).join(`
`),g.length>0&&(g+=`
`),h=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(va).join(`
`),h.length>0&&(h+=`
`)):(g=[Rh(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+d:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(va).join(`
`),h=[Rh(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+d:"",e.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Ai?"#define TONE_MAPPING":"",e.toneMapping!==Ai?oe.tonemapping_pars_fragment:"",e.toneMapping!==Ai?G1("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",oe.colorspace_pars_fragment,H1("linearToOutputTexel",e.outputColorSpace),V1(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(va).join(`
`)),o=Fl(o),o=Eh(o,e),o=Ch(o,e),r=Fl(r),r=Eh(r,e),r=Ch(r,e),o=Ah(o),r=Ah(r),e.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,g=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,h=["#define varying in",e.glslVersion===Gc?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Gc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+h);const w=b+g+o,y=b+h+r,C=bh(s,s.VERTEX_SHADER,w),v=bh(s,s.FRAGMENT_SHADER,y);s.attachShader(S,C),s.attachShader(S,v),e.index0AttributeName!==void 0?s.bindAttribLocation(S,0,e.index0AttributeName):e.morphTargets===!0&&s.bindAttribLocation(S,0,"position"),s.linkProgram(S);function T(_){if(i.debug.checkShaderErrors){const N=s.getProgramInfoLog(S).trim(),U=s.getShaderInfoLog(C).trim(),H=s.getShaderInfoLog(v).trim();let z=!0,L=!0;if(s.getProgramParameter(S,s.LINK_STATUS)===!1)if(z=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,S,C,v);else{const A=Th(s,C,"vertex"),E=Th(s,v,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(S,s.VALIDATE_STATUS)+`

Material Name: `+_.name+`
Material Type: `+_.type+`

Program Info Log: `+N+`
`+A+`
`+E)}else N!==""?console.warn("THREE.WebGLProgram: Program Info Log:",N):(U===""||H==="")&&(L=!1);L&&(_.diagnostics={runnable:z,programLog:N,vertexShader:{log:U,prefix:g},fragmentShader:{log:H,prefix:h}})}s.deleteShader(C),s.deleteShader(v),P=new Po(s,S),x=X1(s,S)}let P;this.getUniforms=function(){return P===void 0&&T(this),P};let x;this.getAttributes=function(){return x===void 0&&T(this),x};let M=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return M===!1&&(M=s.getProgramParameter(S,U1)),M},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(S),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=z1++,this.cacheKey=t,this.usedTimes=1,this.program=S,this.vertexShader=C,this.fragmentShader=v,this}let sv=0;class av{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,s=this._getShaderStage(e),a=this._getShaderStage(n),o=this._getShaderCacheForMaterial(t);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(a)===!1&&(o.add(a),a.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new ov(t),e.set(t,n)),n}}class ov{constructor(t){this.id=sv++,this.code=t,this.usedTimes=0}}function rv(i,t,e,n,s,a,o){const r=new fc,l=new av,c=new Set,d=[],u=s.logarithmicDepthBuffer,f=s.vertexTextures;let m=s.precision;const p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function S(x){return c.add(x),x===0?"uv":`uv${x}`}function g(x,M,_,N,U){const H=N.fog,z=U.geometry,L=x.isMeshStandardMaterial?N.environment:null,A=(x.isMeshStandardMaterial?e:t).get(x.envMap||L),E=A&&A.mapping===$o?A.image.height:null,I=p[x.type];x.precision!==null&&(m=s.getMaxPrecision(x.precision),m!==x.precision&&console.warn("THREE.WebGLProgram.getParameters:",x.precision,"not supported, using",m,"instead."));const V=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,$=V!==void 0?V.length:0;let Q=0;z.morphAttributes.position!==void 0&&(Q=1),z.morphAttributes.normal!==void 0&&(Q=2),z.morphAttributes.color!==void 0&&(Q=3);let it,W,j,ht;if(I){const Me=zn[I];it=Me.vertexShader,W=Me.fragmentShader}else it=x.vertexShader,W=x.fragmentShader,l.update(x),j=l.getVertexShaderID(x),ht=l.getFragmentShaderID(x);const dt=i.getRenderTarget(),Rt=i.state.buffers.depth.getReversed(),Pt=U.isInstancedMesh===!0,kt=U.isBatchedMesh===!0,Kt=!!x.map,st=!!x.matcap,pt=!!A,O=!!x.aoMap,Ft=!!x.lightMap,mt=!!x.bumpMap,Dt=!!x.normalMap,_t=!!x.displacementMap,Yt=!!x.emissiveMap,It=!!x.metalnessMap,D=!!x.roughnessMap,R=x.anisotropy>0,J=x.clearcoat>0,ot=x.dispersion>0,ut=x.iridescence>0,rt=x.sheen>0,Gt=x.transmission>0,St=R&&!!x.anisotropyMap,Lt=J&&!!x.clearcoatMap,ce=J&&!!x.clearcoatNormalMap,gt=J&&!!x.clearcoatRoughnessMap,Ut=ut&&!!x.iridescenceMap,Zt=ut&&!!x.iridescenceThicknessMap,Jt=rt&&!!x.sheenColorMap,zt=rt&&!!x.sheenRoughnessMap,he=!!x.specularMap,ae=!!x.specularColorMap,we=!!x.specularIntensityMap,q=Gt&&!!x.transmissionMap,bt=Gt&&!!x.thicknessMap,nt=!!x.gradientMap,ct=!!x.alphaMap,At=x.alphaTest>0,Et=!!x.alphaHash,ee=!!x.extensions;let ke=Ai;x.toneMapped&&(dt===null||dt.isXRRenderTarget===!0)&&(ke=i.toneMapping);const Ye={shaderID:I,shaderType:x.type,shaderName:x.name,vertexShader:it,fragmentShader:W,defines:x.defines,customVertexShaderID:j,customFragmentShaderID:ht,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:m,batching:kt,batchingColor:kt&&U._colorsTexture!==null,instancing:Pt,instancingColor:Pt&&U.instanceColor!==null,instancingMorph:Pt&&U.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:dt===null?i.outputColorSpace:dt.isXRRenderTarget===!0?dt.texture.colorSpace:Zs,alphaToCoverage:!!x.alphaToCoverage,map:Kt,matcap:st,envMap:pt,envMapMode:pt&&A.mapping,envMapCubeUVHeight:E,aoMap:O,lightMap:Ft,bumpMap:mt,normalMap:Dt,displacementMap:f&&_t,emissiveMap:Yt,normalMapObjectSpace:Dt&&x.normalMapType===ep,normalMapTangentSpace:Dt&&x.normalMapType===Ru,metalnessMap:It,roughnessMap:D,anisotropy:R,anisotropyMap:St,clearcoat:J,clearcoatMap:Lt,clearcoatNormalMap:ce,clearcoatRoughnessMap:gt,dispersion:ot,iridescence:ut,iridescenceMap:Ut,iridescenceThicknessMap:Zt,sheen:rt,sheenColorMap:Jt,sheenRoughnessMap:zt,specularMap:he,specularColorMap:ae,specularIntensityMap:we,transmission:Gt,transmissionMap:q,thicknessMap:bt,gradientMap:nt,opaque:x.transparent===!1&&x.blending===Ds&&x.alphaToCoverage===!1,alphaMap:ct,alphaTest:At,alphaHash:Et,combine:x.combine,mapUv:Kt&&S(x.map.channel),aoMapUv:O&&S(x.aoMap.channel),lightMapUv:Ft&&S(x.lightMap.channel),bumpMapUv:mt&&S(x.bumpMap.channel),normalMapUv:Dt&&S(x.normalMap.channel),displacementMapUv:_t&&S(x.displacementMap.channel),emissiveMapUv:Yt&&S(x.emissiveMap.channel),metalnessMapUv:It&&S(x.metalnessMap.channel),roughnessMapUv:D&&S(x.roughnessMap.channel),anisotropyMapUv:St&&S(x.anisotropyMap.channel),clearcoatMapUv:Lt&&S(x.clearcoatMap.channel),clearcoatNormalMapUv:ce&&S(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:gt&&S(x.clearcoatRoughnessMap.channel),iridescenceMapUv:Ut&&S(x.iridescenceMap.channel),iridescenceThicknessMapUv:Zt&&S(x.iridescenceThicknessMap.channel),sheenColorMapUv:Jt&&S(x.sheenColorMap.channel),sheenRoughnessMapUv:zt&&S(x.sheenRoughnessMap.channel),specularMapUv:he&&S(x.specularMap.channel),specularColorMapUv:ae&&S(x.specularColorMap.channel),specularIntensityMapUv:we&&S(x.specularIntensityMap.channel),transmissionMapUv:q&&S(x.transmissionMap.channel),thicknessMapUv:bt&&S(x.thicknessMap.channel),alphaMapUv:ct&&S(x.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(Dt||R),vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:U.isPoints===!0&&!!z.attributes.uv&&(Kt||ct),fog:!!H,useFog:x.fog===!0,fogExp2:!!H&&H.isFogExp2,flatShading:x.flatShading===!0,sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:u,reverseDepthBuffer:Rt,skinning:U.isSkinnedMesh===!0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:$,morphTextureStride:Q,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&_.length>0,shadowMapType:i.shadowMap.type,toneMapping:ke,decodeVideoTexture:Kt&&x.map.isVideoTexture===!0&&de.getTransfer(x.map.colorSpace)===ye,decodeVideoTextureEmissive:Yt&&x.emissiveMap.isVideoTexture===!0&&de.getTransfer(x.emissiveMap.colorSpace)===ye,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===Ae,flipSided:x.side===sn,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:ee&&x.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ee&&x.extensions.multiDraw===!0||kt)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return Ye.vertexUv1s=c.has(1),Ye.vertexUv2s=c.has(2),Ye.vertexUv3s=c.has(3),c.clear(),Ye}function h(x){const M=[];if(x.shaderID?M.push(x.shaderID):(M.push(x.customVertexShaderID),M.push(x.customFragmentShaderID)),x.defines!==void 0)for(const _ in x.defines)M.push(_),M.push(x.defines[_]);return x.isRawShaderMaterial===!1&&(b(M,x),w(M,x),M.push(i.outputColorSpace)),M.push(x.customProgramCacheKey),M.join()}function b(x,M){x.push(M.precision),x.push(M.outputColorSpace),x.push(M.envMapMode),x.push(M.envMapCubeUVHeight),x.push(M.mapUv),x.push(M.alphaMapUv),x.push(M.lightMapUv),x.push(M.aoMapUv),x.push(M.bumpMapUv),x.push(M.normalMapUv),x.push(M.displacementMapUv),x.push(M.emissiveMapUv),x.push(M.metalnessMapUv),x.push(M.roughnessMapUv),x.push(M.anisotropyMapUv),x.push(M.clearcoatMapUv),x.push(M.clearcoatNormalMapUv),x.push(M.clearcoatRoughnessMapUv),x.push(M.iridescenceMapUv),x.push(M.iridescenceThicknessMapUv),x.push(M.sheenColorMapUv),x.push(M.sheenRoughnessMapUv),x.push(M.specularMapUv),x.push(M.specularColorMapUv),x.push(M.specularIntensityMapUv),x.push(M.transmissionMapUv),x.push(M.thicknessMapUv),x.push(M.combine),x.push(M.fogExp2),x.push(M.sizeAttenuation),x.push(M.morphTargetsCount),x.push(M.morphAttributeCount),x.push(M.numDirLights),x.push(M.numPointLights),x.push(M.numSpotLights),x.push(M.numSpotLightMaps),x.push(M.numHemiLights),x.push(M.numRectAreaLights),x.push(M.numDirLightShadows),x.push(M.numPointLightShadows),x.push(M.numSpotLightShadows),x.push(M.numSpotLightShadowsWithMaps),x.push(M.numLightProbes),x.push(M.shadowMapType),x.push(M.toneMapping),x.push(M.numClippingPlanes),x.push(M.numClipIntersection),x.push(M.depthPacking)}function w(x,M){r.disableAll(),M.supportsVertexTextures&&r.enable(0),M.instancing&&r.enable(1),M.instancingColor&&r.enable(2),M.instancingMorph&&r.enable(3),M.matcap&&r.enable(4),M.envMap&&r.enable(5),M.normalMapObjectSpace&&r.enable(6),M.normalMapTangentSpace&&r.enable(7),M.clearcoat&&r.enable(8),M.iridescence&&r.enable(9),M.alphaTest&&r.enable(10),M.vertexColors&&r.enable(11),M.vertexAlphas&&r.enable(12),M.vertexUv1s&&r.enable(13),M.vertexUv2s&&r.enable(14),M.vertexUv3s&&r.enable(15),M.vertexTangents&&r.enable(16),M.anisotropy&&r.enable(17),M.alphaHash&&r.enable(18),M.batching&&r.enable(19),M.dispersion&&r.enable(20),M.batchingColor&&r.enable(21),x.push(r.mask),r.disableAll(),M.fog&&r.enable(0),M.useFog&&r.enable(1),M.flatShading&&r.enable(2),M.logarithmicDepthBuffer&&r.enable(3),M.reverseDepthBuffer&&r.enable(4),M.skinning&&r.enable(5),M.morphTargets&&r.enable(6),M.morphNormals&&r.enable(7),M.morphColors&&r.enable(8),M.premultipliedAlpha&&r.enable(9),M.shadowMapEnabled&&r.enable(10),M.doubleSided&&r.enable(11),M.flipSided&&r.enable(12),M.useDepthPacking&&r.enable(13),M.dithering&&r.enable(14),M.transmission&&r.enable(15),M.sheen&&r.enable(16),M.opaque&&r.enable(17),M.pointsUvs&&r.enable(18),M.decodeVideoTexture&&r.enable(19),M.decodeVideoTextureEmissive&&r.enable(20),M.alphaToCoverage&&r.enable(21),x.push(r.mask)}function y(x){const M=p[x.type];let _;if(M){const N=zn[M];_=Da.clone(N.uniforms)}else _=x.uniforms;return _}function C(x,M){let _;for(let N=0,U=d.length;N<U;N++){const H=d[N];if(H.cacheKey===M){_=H,++_.usedTimes;break}}return _===void 0&&(_=new iv(i,M,x,a),d.push(_)),_}function v(x){if(--x.usedTimes===0){const M=d.indexOf(x);d[M]=d[d.length-1],d.pop(),x.destroy()}}function T(x){l.remove(x)}function P(){l.dispose()}return{getParameters:g,getProgramCacheKey:h,getUniforms:y,acquireProgram:C,releaseProgram:v,releaseShaderCache:T,programs:d,dispose:P}}function lv(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let r=i.get(o);return r===void 0&&(r={},i.set(o,r)),r}function n(o){i.delete(o)}function s(o,r,l){i.get(o)[r]=l}function a(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:a}}function cv(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.z!==t.z?i.z-t.z:i.id-t.id}function Ph(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function kh(){const i=[];let t=0;const e=[],n=[],s=[];function a(){t=0,e.length=0,n.length=0,s.length=0}function o(u,f,m,p,S,g){let h=i[t];return h===void 0?(h={id:u.id,object:u,geometry:f,material:m,groupOrder:p,renderOrder:u.renderOrder,z:S,group:g},i[t]=h):(h.id=u.id,h.object=u,h.geometry=f,h.material=m,h.groupOrder=p,h.renderOrder=u.renderOrder,h.z=S,h.group=g),t++,h}function r(u,f,m,p,S,g){const h=o(u,f,m,p,S,g);m.transmission>0?n.push(h):m.transparent===!0?s.push(h):e.push(h)}function l(u,f,m,p,S,g){const h=o(u,f,m,p,S,g);m.transmission>0?n.unshift(h):m.transparent===!0?s.unshift(h):e.unshift(h)}function c(u,f){e.length>1&&e.sort(u||cv),n.length>1&&n.sort(f||Ph),s.length>1&&s.sort(f||Ph)}function d(){for(let u=t,f=i.length;u<f;u++){const m=i[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:e,transmissive:n,transparent:s,init:a,push:r,unshift:l,finish:d,sort:c}}function hv(){let i=new WeakMap;function t(n,s){const a=i.get(n);let o;return a===void 0?(o=new kh,i.set(n,[o])):s>=a.length?(o=new kh,a.push(o)):o=a[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function dv(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new G,color:new Tt};break;case"SpotLight":e={position:new G,direction:new G,color:new Tt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new G,color:new Tt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new G,skyColor:new Tt,groundColor:new Tt};break;case"RectAreaLight":e={color:new Tt,position:new G,halfWidth:new G,halfHeight:new G};break}return i[t.id]=e,e}}}function uv(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}let fv=0;function pv(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function mv(i){const t=new dv,e=uv(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new G);const s=new G,a=new _e,o=new _e;function r(c){let d=0,u=0,f=0;for(let x=0;x<9;x++)n.probe[x].set(0,0,0);let m=0,p=0,S=0,g=0,h=0,b=0,w=0,y=0,C=0,v=0,T=0;c.sort(pv);for(let x=0,M=c.length;x<M;x++){const _=c[x],N=_.color,U=_.intensity,H=_.distance,z=_.shadow&&_.shadow.map?_.shadow.map.texture:null;if(_.isAmbientLight)d+=N.r*U,u+=N.g*U,f+=N.b*U;else if(_.isLightProbe){for(let L=0;L<9;L++)n.probe[L].addScaledVector(_.sh.coefficients[L],U);T++}else if(_.isDirectionalLight){const L=t.get(_);if(L.color.copy(_.color).multiplyScalar(_.intensity),_.castShadow){const A=_.shadow,E=e.get(_);E.shadowIntensity=A.intensity,E.shadowBias=A.bias,E.shadowNormalBias=A.normalBias,E.shadowRadius=A.radius,E.shadowMapSize=A.mapSize,n.directionalShadow[m]=E,n.directionalShadowMap[m]=z,n.directionalShadowMatrix[m]=_.shadow.matrix,b++}n.directional[m]=L,m++}else if(_.isSpotLight){const L=t.get(_);L.position.setFromMatrixPosition(_.matrixWorld),L.color.copy(N).multiplyScalar(U),L.distance=H,L.coneCos=Math.cos(_.angle),L.penumbraCos=Math.cos(_.angle*(1-_.penumbra)),L.decay=_.decay,n.spot[S]=L;const A=_.shadow;if(_.map&&(n.spotLightMap[C]=_.map,C++,A.updateMatrices(_),_.castShadow&&v++),n.spotLightMatrix[S]=A.matrix,_.castShadow){const E=e.get(_);E.shadowIntensity=A.intensity,E.shadowBias=A.bias,E.shadowNormalBias=A.normalBias,E.shadowRadius=A.radius,E.shadowMapSize=A.mapSize,n.spotShadow[S]=E,n.spotShadowMap[S]=z,y++}S++}else if(_.isRectAreaLight){const L=t.get(_);L.color.copy(N).multiplyScalar(U),L.halfWidth.set(_.width*.5,0,0),L.halfHeight.set(0,_.height*.5,0),n.rectArea[g]=L,g++}else if(_.isPointLight){const L=t.get(_);if(L.color.copy(_.color).multiplyScalar(_.intensity),L.distance=_.distance,L.decay=_.decay,_.castShadow){const A=_.shadow,E=e.get(_);E.shadowIntensity=A.intensity,E.shadowBias=A.bias,E.shadowNormalBias=A.normalBias,E.shadowRadius=A.radius,E.shadowMapSize=A.mapSize,E.shadowCameraNear=A.camera.near,E.shadowCameraFar=A.camera.far,n.pointShadow[p]=E,n.pointShadowMap[p]=z,n.pointShadowMatrix[p]=_.shadow.matrix,w++}n.point[p]=L,p++}else if(_.isHemisphereLight){const L=t.get(_);L.skyColor.copy(_.color).multiplyScalar(U),L.groundColor.copy(_.groundColor).multiplyScalar(U),n.hemi[h]=L,h++}}g>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=yt.LTC_FLOAT_1,n.rectAreaLTC2=yt.LTC_FLOAT_2):(n.rectAreaLTC1=yt.LTC_HALF_1,n.rectAreaLTC2=yt.LTC_HALF_2)),n.ambient[0]=d,n.ambient[1]=u,n.ambient[2]=f;const P=n.hash;(P.directionalLength!==m||P.pointLength!==p||P.spotLength!==S||P.rectAreaLength!==g||P.hemiLength!==h||P.numDirectionalShadows!==b||P.numPointShadows!==w||P.numSpotShadows!==y||P.numSpotMaps!==C||P.numLightProbes!==T)&&(n.directional.length=m,n.spot.length=S,n.rectArea.length=g,n.point.length=p,n.hemi.length=h,n.directionalShadow.length=b,n.directionalShadowMap.length=b,n.pointShadow.length=w,n.pointShadowMap.length=w,n.spotShadow.length=y,n.spotShadowMap.length=y,n.directionalShadowMatrix.length=b,n.pointShadowMatrix.length=w,n.spotLightMatrix.length=y+C-v,n.spotLightMap.length=C,n.numSpotLightShadowsWithMaps=v,n.numLightProbes=T,P.directionalLength=m,P.pointLength=p,P.spotLength=S,P.rectAreaLength=g,P.hemiLength=h,P.numDirectionalShadows=b,P.numPointShadows=w,P.numSpotShadows=y,P.numSpotMaps=C,P.numLightProbes=T,n.version=fv++)}function l(c,d){let u=0,f=0,m=0,p=0,S=0;const g=d.matrixWorldInverse;for(let h=0,b=c.length;h<b;h++){const w=c[h];if(w.isDirectionalLight){const y=n.directional[u];y.direction.setFromMatrixPosition(w.matrixWorld),s.setFromMatrixPosition(w.target.matrixWorld),y.direction.sub(s),y.direction.transformDirection(g),u++}else if(w.isSpotLight){const y=n.spot[m];y.position.setFromMatrixPosition(w.matrixWorld),y.position.applyMatrix4(g),y.direction.setFromMatrixPosition(w.matrixWorld),s.setFromMatrixPosition(w.target.matrixWorld),y.direction.sub(s),y.direction.transformDirection(g),m++}else if(w.isRectAreaLight){const y=n.rectArea[p];y.position.setFromMatrixPosition(w.matrixWorld),y.position.applyMatrix4(g),o.identity(),a.copy(w.matrixWorld),a.premultiply(g),o.extractRotation(a),y.halfWidth.set(w.width*.5,0,0),y.halfHeight.set(0,w.height*.5,0),y.halfWidth.applyMatrix4(o),y.halfHeight.applyMatrix4(o),p++}else if(w.isPointLight){const y=n.point[f];y.position.setFromMatrixPosition(w.matrixWorld),y.position.applyMatrix4(g),f++}else if(w.isHemisphereLight){const y=n.hemi[S];y.direction.setFromMatrixPosition(w.matrixWorld),y.direction.transformDirection(g),S++}}}return{setup:r,setupView:l,state:n}}function Ih(i){const t=new mv(i),e=[],n=[];function s(d){c.camera=d,e.length=0,n.length=0}function a(d){e.push(d)}function o(d){n.push(d)}function r(){t.setup(e)}function l(d){t.setupView(e,d)}const c={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:r,setupLightsView:l,pushLight:a,pushShadow:o}}function gv(i){let t=new WeakMap;function e(s,a=0){const o=t.get(s);let r;return o===void 0?(r=new Ih(i),t.set(s,[r])):a>=o.length?(r=new Ih(i),o.push(r)):r=o[a],r}function n(){t=new WeakMap}return{get:e,dispose:n}}class vv extends Qs{static get type(){return"MeshDepthMaterial"}constructor(t){super(),this.isMeshDepthMaterial=!0,this.depthPacking=Qf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class xv extends Qs{static get type(){return"MeshDistanceMaterial"}constructor(t){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const _v=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Mv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function yv(i,t,e){let n=new pc;const s=new ft,a=new ft,o=new be,r=new vv({depthPacking:tp}),l=new xv,c={},d=e.maxTextureSize,u={[Di]:sn,[sn]:Di,[Ae]:Ae},f=new Fe({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ft},radius:{value:4}},vertexShader:_v,fragmentShader:Mv}),m=f.clone();m.defines.HORIZONTAL_PASS=1;const p=new Ue;p.setAttribute("position",new Le(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const S=new F(p,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=nc;let h=this.type;this.render=function(v,T,P){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||v.length===0)return;const x=i.getRenderTarget(),M=i.getActiveCubeFace(),_=i.getActiveMipmapLevel(),N=i.state;N.setBlending(li),N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);const U=h!==ii&&this.type===ii,H=h===ii&&this.type!==ii;for(let z=0,L=v.length;z<L;z++){const A=v[z],E=A.shadow;if(E===void 0){console.warn("THREE.WebGLShadowMap:",A,"has no shadow.");continue}if(E.autoUpdate===!1&&E.needsUpdate===!1)continue;s.copy(E.mapSize);const I=E.getFrameExtents();if(s.multiply(I),a.copy(E.mapSize),(s.x>d||s.y>d)&&(s.x>d&&(a.x=Math.floor(d/I.x),s.x=a.x*I.x,E.mapSize.x=a.x),s.y>d&&(a.y=Math.floor(d/I.y),s.y=a.y*I.y,E.mapSize.y=a.y)),E.map===null||U===!0||H===!0){const $=this.type!==ii?{minFilter:mn,magFilter:mn}:{};E.map!==null&&E.map.dispose(),E.map=new kn(s.x,s.y,$),E.map.texture.name=A.name+".shadowMap",E.camera.updateProjectionMatrix()}i.setRenderTarget(E.map),i.clear();const V=E.getViewportCount();for(let $=0;$<V;$++){const Q=E.getViewport($);o.set(a.x*Q.x,a.y*Q.y,a.x*Q.z,a.y*Q.w),N.viewport(o),E.updateMatrices(A,$),n=E.getFrustum(),y(T,P,E.camera,A,this.type)}E.isPointLightShadow!==!0&&this.type===ii&&b(E,P),E.needsUpdate=!1}h=this.type,g.needsUpdate=!1,i.setRenderTarget(x,M,_)};function b(v,T){const P=t.update(S);f.defines.VSM_SAMPLES!==v.blurSamples&&(f.defines.VSM_SAMPLES=v.blurSamples,m.defines.VSM_SAMPLES=v.blurSamples,f.needsUpdate=!0,m.needsUpdate=!0),v.mapPass===null&&(v.mapPass=new kn(s.x,s.y)),f.uniforms.shadow_pass.value=v.map.texture,f.uniforms.resolution.value=v.mapSize,f.uniforms.radius.value=v.radius,i.setRenderTarget(v.mapPass),i.clear(),i.renderBufferDirect(T,null,P,f,S,null),m.uniforms.shadow_pass.value=v.mapPass.texture,m.uniforms.resolution.value=v.mapSize,m.uniforms.radius.value=v.radius,i.setRenderTarget(v.map),i.clear(),i.renderBufferDirect(T,null,P,m,S,null)}function w(v,T,P,x){let M=null;const _=P.isPointLight===!0?v.customDistanceMaterial:v.customDepthMaterial;if(_!==void 0)M=_;else if(M=P.isPointLight===!0?l:r,i.localClippingEnabled&&T.clipShadows===!0&&Array.isArray(T.clippingPlanes)&&T.clippingPlanes.length!==0||T.displacementMap&&T.displacementScale!==0||T.alphaMap&&T.alphaTest>0||T.map&&T.alphaTest>0){const N=M.uuid,U=T.uuid;let H=c[N];H===void 0&&(H={},c[N]=H);let z=H[U];z===void 0&&(z=M.clone(),H[U]=z,T.addEventListener("dispose",C)),M=z}if(M.visible=T.visible,M.wireframe=T.wireframe,x===ii?M.side=T.shadowSide!==null?T.shadowSide:T.side:M.side=T.shadowSide!==null?T.shadowSide:u[T.side],M.alphaMap=T.alphaMap,M.alphaTest=T.alphaTest,M.map=T.map,M.clipShadows=T.clipShadows,M.clippingPlanes=T.clippingPlanes,M.clipIntersection=T.clipIntersection,M.displacementMap=T.displacementMap,M.displacementScale=T.displacementScale,M.displacementBias=T.displacementBias,M.wireframeLinewidth=T.wireframeLinewidth,M.linewidth=T.linewidth,P.isPointLight===!0&&M.isMeshDistanceMaterial===!0){const N=i.properties.get(M);N.light=P}return M}function y(v,T,P,x,M){if(v.visible===!1)return;if(v.layers.test(T.layers)&&(v.isMesh||v.isLine||v.isPoints)&&(v.castShadow||v.receiveShadow&&M===ii)&&(!v.frustumCulled||n.intersectsObject(v))){v.modelViewMatrix.multiplyMatrices(P.matrixWorldInverse,v.matrixWorld);const U=t.update(v),H=v.material;if(Array.isArray(H)){const z=U.groups;for(let L=0,A=z.length;L<A;L++){const E=z[L],I=H[E.materialIndex];if(I&&I.visible){const V=w(v,I,x,M);v.onBeforeShadow(i,v,T,P,U,V,E),i.renderBufferDirect(P,null,U,V,v,E),v.onAfterShadow(i,v,T,P,U,V,E)}}}else if(H.visible){const z=w(v,H,x,M);v.onBeforeShadow(i,v,T,P,U,z,null),i.renderBufferDirect(P,null,U,z,v,null),v.onAfterShadow(i,v,T,P,U,z,null)}}const N=v.children;for(let U=0,H=N.length;U<H;U++)y(N[U],T,P,x,M)}function C(v){v.target.removeEventListener("dispose",C);for(const P in c){const x=c[P],M=v.target.uuid;M in x&&(x[M].dispose(),delete x[M])}}}const Sv={[nl]:il,[sl]:rl,[al]:ll,[Fs]:ol,[il]:nl,[rl]:sl,[ll]:al,[ol]:Fs};function bv(i,t){function e(){let q=!1;const bt=new be;let nt=null;const ct=new be(0,0,0,0);return{setMask:function(At){nt!==At&&!q&&(i.colorMask(At,At,At,At),nt=At)},setLocked:function(At){q=At},setClear:function(At,Et,ee,ke,Ye){Ye===!0&&(At*=ke,Et*=ke,ee*=ke),bt.set(At,Et,ee,ke),ct.equals(bt)===!1&&(i.clearColor(At,Et,ee,ke),ct.copy(bt))},reset:function(){q=!1,nt=null,ct.set(-1,0,0,0)}}}function n(){let q=!1,bt=!1,nt=null,ct=null,At=null;return{setReversed:function(Et){if(bt!==Et){const ee=t.get("EXT_clip_control");bt?ee.clipControlEXT(ee.LOWER_LEFT_EXT,ee.ZERO_TO_ONE_EXT):ee.clipControlEXT(ee.LOWER_LEFT_EXT,ee.NEGATIVE_ONE_TO_ONE_EXT);const ke=At;At=null,this.setClear(ke)}bt=Et},getReversed:function(){return bt},setTest:function(Et){Et?dt(i.DEPTH_TEST):Rt(i.DEPTH_TEST)},setMask:function(Et){nt!==Et&&!q&&(i.depthMask(Et),nt=Et)},setFunc:function(Et){if(bt&&(Et=Sv[Et]),ct!==Et){switch(Et){case nl:i.depthFunc(i.NEVER);break;case il:i.depthFunc(i.ALWAYS);break;case sl:i.depthFunc(i.LESS);break;case Fs:i.depthFunc(i.LEQUAL);break;case al:i.depthFunc(i.EQUAL);break;case ol:i.depthFunc(i.GEQUAL);break;case rl:i.depthFunc(i.GREATER);break;case ll:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ct=Et}},setLocked:function(Et){q=Et},setClear:function(Et){At!==Et&&(bt&&(Et=1-Et),i.clearDepth(Et),At=Et)},reset:function(){q=!1,nt=null,ct=null,At=null,bt=!1}}}function s(){let q=!1,bt=null,nt=null,ct=null,At=null,Et=null,ee=null,ke=null,Ye=null;return{setTest:function(Me){q||(Me?dt(i.STENCIL_TEST):Rt(i.STENCIL_TEST))},setMask:function(Me){bt!==Me&&!q&&(i.stencilMask(Me),bt=Me)},setFunc:function(Me,Sn,Zn){(nt!==Me||ct!==Sn||At!==Zn)&&(i.stencilFunc(Me,Sn,Zn),nt=Me,ct=Sn,At=Zn)},setOp:function(Me,Sn,Zn){(Et!==Me||ee!==Sn||ke!==Zn)&&(i.stencilOp(Me,Sn,Zn),Et=Me,ee=Sn,ke=Zn)},setLocked:function(Me){q=Me},setClear:function(Me){Ye!==Me&&(i.clearStencil(Me),Ye=Me)},reset:function(){q=!1,bt=null,nt=null,ct=null,At=null,Et=null,ee=null,ke=null,Ye=null}}}const a=new e,o=new n,r=new s,l=new WeakMap,c=new WeakMap;let d={},u={},f=new WeakMap,m=[],p=null,S=!1,g=null,h=null,b=null,w=null,y=null,C=null,v=null,T=new Tt(0,0,0),P=0,x=!1,M=null,_=null,N=null,U=null,H=null;const z=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let L=!1,A=0;const E=i.getParameter(i.VERSION);E.indexOf("WebGL")!==-1?(A=parseFloat(/^WebGL (\d)/.exec(E)[1]),L=A>=1):E.indexOf("OpenGL ES")!==-1&&(A=parseFloat(/^OpenGL ES (\d)/.exec(E)[1]),L=A>=2);let I=null,V={};const $=i.getParameter(i.SCISSOR_BOX),Q=i.getParameter(i.VIEWPORT),it=new be().fromArray($),W=new be().fromArray(Q);function j(q,bt,nt,ct){const At=new Uint8Array(4),Et=i.createTexture();i.bindTexture(q,Et),i.texParameteri(q,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(q,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let ee=0;ee<nt;ee++)q===i.TEXTURE_3D||q===i.TEXTURE_2D_ARRAY?i.texImage3D(bt,0,i.RGBA,1,1,ct,0,i.RGBA,i.UNSIGNED_BYTE,At):i.texImage2D(bt+ee,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,At);return Et}const ht={};ht[i.TEXTURE_2D]=j(i.TEXTURE_2D,i.TEXTURE_2D,1),ht[i.TEXTURE_CUBE_MAP]=j(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ht[i.TEXTURE_2D_ARRAY]=j(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ht[i.TEXTURE_3D]=j(i.TEXTURE_3D,i.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),r.setClear(0),dt(i.DEPTH_TEST),o.setFunc(Fs),mt(!1),Dt(Uc),dt(i.CULL_FACE),O(li);function dt(q){d[q]!==!0&&(i.enable(q),d[q]=!0)}function Rt(q){d[q]!==!1&&(i.disable(q),d[q]=!1)}function Pt(q,bt){return u[q]!==bt?(i.bindFramebuffer(q,bt),u[q]=bt,q===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=bt),q===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=bt),!0):!1}function kt(q,bt){let nt=m,ct=!1;if(q){nt=f.get(bt),nt===void 0&&(nt=[],f.set(bt,nt));const At=q.textures;if(nt.length!==At.length||nt[0]!==i.COLOR_ATTACHMENT0){for(let Et=0,ee=At.length;Et<ee;Et++)nt[Et]=i.COLOR_ATTACHMENT0+Et;nt.length=At.length,ct=!0}}else nt[0]!==i.BACK&&(nt[0]=i.BACK,ct=!0);ct&&i.drawBuffers(nt)}function Kt(q){return p!==q?(i.useProgram(q),p=q,!0):!1}const st={[Xi]:i.FUNC_ADD,[If]:i.FUNC_SUBTRACT,[Lf]:i.FUNC_REVERSE_SUBTRACT};st[Df]=i.MIN,st[Bf]=i.MAX;const pt={[Nf]:i.ZERO,[Uf]:i.ONE,[zf]:i.SRC_COLOR,[tl]:i.SRC_ALPHA,[$f]:i.SRC_ALPHA_SATURATE,[Gf]:i.DST_COLOR,[Of]:i.DST_ALPHA,[Ff]:i.ONE_MINUS_SRC_COLOR,[el]:i.ONE_MINUS_SRC_ALPHA,[Vf]:i.ONE_MINUS_DST_COLOR,[Hf]:i.ONE_MINUS_DST_ALPHA,[Wf]:i.CONSTANT_COLOR,[Xf]:i.ONE_MINUS_CONSTANT_COLOR,[qf]:i.CONSTANT_ALPHA,[Kf]:i.ONE_MINUS_CONSTANT_ALPHA};function O(q,bt,nt,ct,At,Et,ee,ke,Ye,Me){if(q===li){S===!0&&(Rt(i.BLEND),S=!1);return}if(S===!1&&(dt(i.BLEND),S=!0),q!==kf){if(q!==g||Me!==x){if((h!==Xi||y!==Xi)&&(i.blendEquation(i.FUNC_ADD),h=Xi,y=Xi),Me)switch(q){case Ds:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ka:i.blendFunc(i.ONE,i.ONE);break;case zc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Fc:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",q);break}else switch(q){case Ds:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ka:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case zc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Fc:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",q);break}b=null,w=null,C=null,v=null,T.set(0,0,0),P=0,g=q,x=Me}return}At=At||bt,Et=Et||nt,ee=ee||ct,(bt!==h||At!==y)&&(i.blendEquationSeparate(st[bt],st[At]),h=bt,y=At),(nt!==b||ct!==w||Et!==C||ee!==v)&&(i.blendFuncSeparate(pt[nt],pt[ct],pt[Et],pt[ee]),b=nt,w=ct,C=Et,v=ee),(ke.equals(T)===!1||Ye!==P)&&(i.blendColor(ke.r,ke.g,ke.b,Ye),T.copy(ke),P=Ye),g=q,x=!1}function Ft(q,bt){q.side===Ae?Rt(i.CULL_FACE):dt(i.CULL_FACE);let nt=q.side===sn;bt&&(nt=!nt),mt(nt),q.blending===Ds&&q.transparent===!1?O(li):O(q.blending,q.blendEquation,q.blendSrc,q.blendDst,q.blendEquationAlpha,q.blendSrcAlpha,q.blendDstAlpha,q.blendColor,q.blendAlpha,q.premultipliedAlpha),o.setFunc(q.depthFunc),o.setTest(q.depthTest),o.setMask(q.depthWrite),a.setMask(q.colorWrite);const ct=q.stencilWrite;r.setTest(ct),ct&&(r.setMask(q.stencilWriteMask),r.setFunc(q.stencilFunc,q.stencilRef,q.stencilFuncMask),r.setOp(q.stencilFail,q.stencilZFail,q.stencilZPass)),Yt(q.polygonOffset,q.polygonOffsetFactor,q.polygonOffsetUnits),q.alphaToCoverage===!0?dt(i.SAMPLE_ALPHA_TO_COVERAGE):Rt(i.SAMPLE_ALPHA_TO_COVERAGE)}function mt(q){M!==q&&(q?i.frontFace(i.CW):i.frontFace(i.CCW),M=q)}function Dt(q){q!==Af?(dt(i.CULL_FACE),q!==_&&(q===Uc?i.cullFace(i.BACK):q===Rf?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Rt(i.CULL_FACE),_=q}function _t(q){q!==N&&(L&&i.lineWidth(q),N=q)}function Yt(q,bt,nt){q?(dt(i.POLYGON_OFFSET_FILL),(U!==bt||H!==nt)&&(i.polygonOffset(bt,nt),U=bt,H=nt)):Rt(i.POLYGON_OFFSET_FILL)}function It(q){q?dt(i.SCISSOR_TEST):Rt(i.SCISSOR_TEST)}function D(q){q===void 0&&(q=i.TEXTURE0+z-1),I!==q&&(i.activeTexture(q),I=q)}function R(q,bt,nt){nt===void 0&&(I===null?nt=i.TEXTURE0+z-1:nt=I);let ct=V[nt];ct===void 0&&(ct={type:void 0,texture:void 0},V[nt]=ct),(ct.type!==q||ct.texture!==bt)&&(I!==nt&&(i.activeTexture(nt),I=nt),i.bindTexture(q,bt||ht[q]),ct.type=q,ct.texture=bt)}function J(){const q=V[I];q!==void 0&&q.type!==void 0&&(i.bindTexture(q.type,null),q.type=void 0,q.texture=void 0)}function ot(){try{i.compressedTexImage2D.apply(i,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function ut(){try{i.compressedTexImage3D.apply(i,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function rt(){try{i.texSubImage2D.apply(i,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function Gt(){try{i.texSubImage3D.apply(i,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function St(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function Lt(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function ce(){try{i.texStorage2D.apply(i,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function gt(){try{i.texStorage3D.apply(i,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function Ut(){try{i.texImage2D.apply(i,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function Zt(){try{i.texImage3D.apply(i,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function Jt(q){it.equals(q)===!1&&(i.scissor(q.x,q.y,q.z,q.w),it.copy(q))}function zt(q){W.equals(q)===!1&&(i.viewport(q.x,q.y,q.z,q.w),W.copy(q))}function he(q,bt){let nt=c.get(bt);nt===void 0&&(nt=new WeakMap,c.set(bt,nt));let ct=nt.get(q);ct===void 0&&(ct=i.getUniformBlockIndex(bt,q.name),nt.set(q,ct))}function ae(q,bt){const ct=c.get(bt).get(q);l.get(bt)!==ct&&(i.uniformBlockBinding(bt,ct,q.__bindingPointIndex),l.set(bt,ct))}function we(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),d={},I=null,V={},u={},f=new WeakMap,m=[],p=null,S=!1,g=null,h=null,b=null,w=null,y=null,C=null,v=null,T=new Tt(0,0,0),P=0,x=!1,M=null,_=null,N=null,U=null,H=null,it.set(0,0,i.canvas.width,i.canvas.height),W.set(0,0,i.canvas.width,i.canvas.height),a.reset(),o.reset(),r.reset()}return{buffers:{color:a,depth:o,stencil:r},enable:dt,disable:Rt,bindFramebuffer:Pt,drawBuffers:kt,useProgram:Kt,setBlending:O,setMaterial:Ft,setFlipSided:mt,setCullFace:Dt,setLineWidth:_t,setPolygonOffset:Yt,setScissorTest:It,activeTexture:D,bindTexture:R,unbindTexture:J,compressedTexImage2D:ot,compressedTexImage3D:ut,texImage2D:Ut,texImage3D:Zt,updateUBOMapping:he,uniformBlockBinding:ae,texStorage2D:ce,texStorage3D:gt,texSubImage2D:rt,texSubImage3D:Gt,compressedTexSubImage2D:St,compressedTexSubImage3D:Lt,scissor:Jt,viewport:zt,reset:we}}function Lh(i,t,e,n){const s=wv(n);switch(e){case bu:return i*t;case Tu:return i*t;case Eu:return i*t*2;case rc:return i*t/s.components*s.byteLength;case lc:return i*t/s.components*s.byteLength;case Cu:return i*t*2/s.components*s.byteLength;case cc:return i*t*2/s.components*s.byteLength;case wu:return i*t*3/s.components*s.byteLength;case Pn:return i*t*4/s.components*s.byteLength;case hc:return i*t*4/s.components*s.byteLength;case To:case Eo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Co:case Ao:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case fl:case ml:return Math.max(i,16)*Math.max(t,8)/4;case ul:case pl:return Math.max(i,8)*Math.max(t,8)/2;case gl:case vl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case xl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case _l:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Ml:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case yl:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case Sl:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case bl:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case wl:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Tl:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case El:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Cl:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Al:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Rl:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case Pl:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case kl:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Il:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Ro:case Ll:case Dl:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Au:case Bl:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Nl:case Ul:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function wv(i){switch(i){case ui:case Mu:return{byteLength:1,components:1};case Ia:case yu:case ci:return{byteLength:2,components:1};case ac:case oc:return{byteLength:2,components:4};case ns:case sc:case Gn:return{byteLength:4,components:1};case Su:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}function Tv(i,t,e,n,s,a,o){const r=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ft,d=new WeakMap;let u;const f=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function p(D,R){return m?new OffscreenCanvas(D,R):Lo("canvas")}function S(D,R,J){let ot=1;const ut=It(D);if((ut.width>J||ut.height>J)&&(ot=J/Math.max(ut.width,ut.height)),ot<1)if(typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&D instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&D instanceof ImageBitmap||typeof VideoFrame<"u"&&D instanceof VideoFrame){const rt=Math.floor(ot*ut.width),Gt=Math.floor(ot*ut.height);u===void 0&&(u=p(rt,Gt));const St=R?p(rt,Gt):u;return St.width=rt,St.height=Gt,St.getContext("2d").drawImage(D,0,0,rt,Gt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+ut.width+"x"+ut.height+") to ("+rt+"x"+Gt+")."),St}else return"data"in D&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+ut.width+"x"+ut.height+")."),D;return D}function g(D){return D.generateMipmaps}function h(D){i.generateMipmap(D)}function b(D){return D.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:D.isWebGL3DRenderTarget?i.TEXTURE_3D:D.isWebGLArrayRenderTarget||D.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function w(D,R,J,ot,ut=!1){if(D!==null){if(i[D]!==void 0)return i[D];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+D+"'")}let rt=R;if(R===i.RED&&(J===i.FLOAT&&(rt=i.R32F),J===i.HALF_FLOAT&&(rt=i.R16F),J===i.UNSIGNED_BYTE&&(rt=i.R8)),R===i.RED_INTEGER&&(J===i.UNSIGNED_BYTE&&(rt=i.R8UI),J===i.UNSIGNED_SHORT&&(rt=i.R16UI),J===i.UNSIGNED_INT&&(rt=i.R32UI),J===i.BYTE&&(rt=i.R8I),J===i.SHORT&&(rt=i.R16I),J===i.INT&&(rt=i.R32I)),R===i.RG&&(J===i.FLOAT&&(rt=i.RG32F),J===i.HALF_FLOAT&&(rt=i.RG16F),J===i.UNSIGNED_BYTE&&(rt=i.RG8)),R===i.RG_INTEGER&&(J===i.UNSIGNED_BYTE&&(rt=i.RG8UI),J===i.UNSIGNED_SHORT&&(rt=i.RG16UI),J===i.UNSIGNED_INT&&(rt=i.RG32UI),J===i.BYTE&&(rt=i.RG8I),J===i.SHORT&&(rt=i.RG16I),J===i.INT&&(rt=i.RG32I)),R===i.RGB_INTEGER&&(J===i.UNSIGNED_BYTE&&(rt=i.RGB8UI),J===i.UNSIGNED_SHORT&&(rt=i.RGB16UI),J===i.UNSIGNED_INT&&(rt=i.RGB32UI),J===i.BYTE&&(rt=i.RGB8I),J===i.SHORT&&(rt=i.RGB16I),J===i.INT&&(rt=i.RGB32I)),R===i.RGBA_INTEGER&&(J===i.UNSIGNED_BYTE&&(rt=i.RGBA8UI),J===i.UNSIGNED_SHORT&&(rt=i.RGBA16UI),J===i.UNSIGNED_INT&&(rt=i.RGBA32UI),J===i.BYTE&&(rt=i.RGBA8I),J===i.SHORT&&(rt=i.RGBA16I),J===i.INT&&(rt=i.RGBA32I)),R===i.RGB&&J===i.UNSIGNED_INT_5_9_9_9_REV&&(rt=i.RGB9_E5),R===i.RGBA){const Gt=ut?Wo:de.getTransfer(ot);J===i.FLOAT&&(rt=i.RGBA32F),J===i.HALF_FLOAT&&(rt=i.RGBA16F),J===i.UNSIGNED_BYTE&&(rt=Gt===ye?i.SRGB8_ALPHA8:i.RGBA8),J===i.UNSIGNED_SHORT_4_4_4_4&&(rt=i.RGBA4),J===i.UNSIGNED_SHORT_5_5_5_1&&(rt=i.RGB5_A1)}return(rt===i.R16F||rt===i.R32F||rt===i.RG16F||rt===i.RG32F||rt===i.RGBA16F||rt===i.RGBA32F)&&t.get("EXT_color_buffer_float"),rt}function y(D,R){let J;return D?R===null||R===ns||R===Gs?J=i.DEPTH24_STENCIL8:R===Gn?J=i.DEPTH32F_STENCIL8:R===Ia&&(J=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):R===null||R===ns||R===Gs?J=i.DEPTH_COMPONENT24:R===Gn?J=i.DEPTH_COMPONENT32F:R===Ia&&(J=i.DEPTH_COMPONENT16),J}function C(D,R){return g(D)===!0||D.isFramebufferTexture&&D.minFilter!==mn&&D.minFilter!==Hn?Math.log2(Math.max(R.width,R.height))+1:D.mipmaps!==void 0&&D.mipmaps.length>0?D.mipmaps.length:D.isCompressedTexture&&Array.isArray(D.image)?R.mipmaps.length:1}function v(D){const R=D.target;R.removeEventListener("dispose",v),P(R),R.isVideoTexture&&d.delete(R)}function T(D){const R=D.target;R.removeEventListener("dispose",T),M(R)}function P(D){const R=n.get(D);if(R.__webglInit===void 0)return;const J=D.source,ot=f.get(J);if(ot){const ut=ot[R.__cacheKey];ut.usedTimes--,ut.usedTimes===0&&x(D),Object.keys(ot).length===0&&f.delete(J)}n.remove(D)}function x(D){const R=n.get(D);i.deleteTexture(R.__webglTexture);const J=D.source,ot=f.get(J);delete ot[R.__cacheKey],o.memory.textures--}function M(D){const R=n.get(D);if(D.depthTexture&&(D.depthTexture.dispose(),n.remove(D.depthTexture)),D.isWebGLCubeRenderTarget)for(let ot=0;ot<6;ot++){if(Array.isArray(R.__webglFramebuffer[ot]))for(let ut=0;ut<R.__webglFramebuffer[ot].length;ut++)i.deleteFramebuffer(R.__webglFramebuffer[ot][ut]);else i.deleteFramebuffer(R.__webglFramebuffer[ot]);R.__webglDepthbuffer&&i.deleteRenderbuffer(R.__webglDepthbuffer[ot])}else{if(Array.isArray(R.__webglFramebuffer))for(let ot=0;ot<R.__webglFramebuffer.length;ot++)i.deleteFramebuffer(R.__webglFramebuffer[ot]);else i.deleteFramebuffer(R.__webglFramebuffer);if(R.__webglDepthbuffer&&i.deleteRenderbuffer(R.__webglDepthbuffer),R.__webglMultisampledFramebuffer&&i.deleteFramebuffer(R.__webglMultisampledFramebuffer),R.__webglColorRenderbuffer)for(let ot=0;ot<R.__webglColorRenderbuffer.length;ot++)R.__webglColorRenderbuffer[ot]&&i.deleteRenderbuffer(R.__webglColorRenderbuffer[ot]);R.__webglDepthRenderbuffer&&i.deleteRenderbuffer(R.__webglDepthRenderbuffer)}const J=D.textures;for(let ot=0,ut=J.length;ot<ut;ot++){const rt=n.get(J[ot]);rt.__webglTexture&&(i.deleteTexture(rt.__webglTexture),o.memory.textures--),n.remove(J[ot])}n.remove(D)}let _=0;function N(){_=0}function U(){const D=_;return D>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+D+" texture units while this GPU supports only "+s.maxTextures),_+=1,D}function H(D){const R=[];return R.push(D.wrapS),R.push(D.wrapT),R.push(D.wrapR||0),R.push(D.magFilter),R.push(D.minFilter),R.push(D.anisotropy),R.push(D.internalFormat),R.push(D.format),R.push(D.type),R.push(D.generateMipmaps),R.push(D.premultiplyAlpha),R.push(D.flipY),R.push(D.unpackAlignment),R.push(D.colorSpace),R.join()}function z(D,R){const J=n.get(D);if(D.isVideoTexture&&_t(D),D.isRenderTargetTexture===!1&&D.version>0&&J.__version!==D.version){const ot=D.image;if(ot===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ot.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{W(J,D,R);return}}e.bindTexture(i.TEXTURE_2D,J.__webglTexture,i.TEXTURE0+R)}function L(D,R){const J=n.get(D);if(D.version>0&&J.__version!==D.version){W(J,D,R);return}e.bindTexture(i.TEXTURE_2D_ARRAY,J.__webglTexture,i.TEXTURE0+R)}function A(D,R){const J=n.get(D);if(D.version>0&&J.__version!==D.version){W(J,D,R);return}e.bindTexture(i.TEXTURE_3D,J.__webglTexture,i.TEXTURE0+R)}function E(D,R){const J=n.get(D);if(D.version>0&&J.__version!==D.version){j(J,D,R);return}e.bindTexture(i.TEXTURE_CUBE_MAP,J.__webglTexture,i.TEXTURE0+R)}const I={[es]:i.REPEAT,[Ke]:i.CLAMP_TO_EDGE,[dl]:i.MIRRORED_REPEAT},V={[mn]:i.NEAREST,[Jf]:i.NEAREST_MIPMAP_NEAREST,[Xa]:i.NEAREST_MIPMAP_LINEAR,[Hn]:i.LINEAR,[Qo]:i.LINEAR_MIPMAP_NEAREST,[Yi]:i.LINEAR_MIPMAP_LINEAR},$={[np]:i.NEVER,[lp]:i.ALWAYS,[ip]:i.LESS,[Pu]:i.LEQUAL,[sp]:i.EQUAL,[rp]:i.GEQUAL,[ap]:i.GREATER,[op]:i.NOTEQUAL};function Q(D,R){if(R.type===Gn&&t.has("OES_texture_float_linear")===!1&&(R.magFilter===Hn||R.magFilter===Qo||R.magFilter===Xa||R.magFilter===Yi||R.minFilter===Hn||R.minFilter===Qo||R.minFilter===Xa||R.minFilter===Yi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(D,i.TEXTURE_WRAP_S,I[R.wrapS]),i.texParameteri(D,i.TEXTURE_WRAP_T,I[R.wrapT]),(D===i.TEXTURE_3D||D===i.TEXTURE_2D_ARRAY)&&i.texParameteri(D,i.TEXTURE_WRAP_R,I[R.wrapR]),i.texParameteri(D,i.TEXTURE_MAG_FILTER,V[R.magFilter]),i.texParameteri(D,i.TEXTURE_MIN_FILTER,V[R.minFilter]),R.compareFunction&&(i.texParameteri(D,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(D,i.TEXTURE_COMPARE_FUNC,$[R.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(R.magFilter===mn||R.minFilter!==Xa&&R.minFilter!==Yi||R.type===Gn&&t.has("OES_texture_float_linear")===!1)return;if(R.anisotropy>1||n.get(R).__currentAnisotropy){const J=t.get("EXT_texture_filter_anisotropic");i.texParameterf(D,J.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(R.anisotropy,s.getMaxAnisotropy())),n.get(R).__currentAnisotropy=R.anisotropy}}}function it(D,R){let J=!1;D.__webglInit===void 0&&(D.__webglInit=!0,R.addEventListener("dispose",v));const ot=R.source;let ut=f.get(ot);ut===void 0&&(ut={},f.set(ot,ut));const rt=H(R);if(rt!==D.__cacheKey){ut[rt]===void 0&&(ut[rt]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,J=!0),ut[rt].usedTimes++;const Gt=ut[D.__cacheKey];Gt!==void 0&&(ut[D.__cacheKey].usedTimes--,Gt.usedTimes===0&&x(R)),D.__cacheKey=rt,D.__webglTexture=ut[rt].texture}return J}function W(D,R,J){let ot=i.TEXTURE_2D;(R.isDataArrayTexture||R.isCompressedArrayTexture)&&(ot=i.TEXTURE_2D_ARRAY),R.isData3DTexture&&(ot=i.TEXTURE_3D);const ut=it(D,R),rt=R.source;e.bindTexture(ot,D.__webglTexture,i.TEXTURE0+J);const Gt=n.get(rt);if(rt.version!==Gt.__version||ut===!0){e.activeTexture(i.TEXTURE0+J);const St=de.getPrimaries(de.workingColorSpace),Lt=R.colorSpace===Ci?null:de.getPrimaries(R.colorSpace),ce=R.colorSpace===Ci||St===Lt?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,R.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,R.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ce);let gt=S(R.image,!1,s.maxTextureSize);gt=Yt(R,gt);const Ut=a.convert(R.format,R.colorSpace),Zt=a.convert(R.type);let Jt=w(R.internalFormat,Ut,Zt,R.colorSpace,R.isVideoTexture);Q(ot,R);let zt;const he=R.mipmaps,ae=R.isVideoTexture!==!0,we=Gt.__version===void 0||ut===!0,q=rt.dataReady,bt=C(R,gt);if(R.isDepthTexture)Jt=y(R.format===Vs,R.type),we&&(ae?e.texStorage2D(i.TEXTURE_2D,1,Jt,gt.width,gt.height):e.texImage2D(i.TEXTURE_2D,0,Jt,gt.width,gt.height,0,Ut,Zt,null));else if(R.isDataTexture)if(he.length>0){ae&&we&&e.texStorage2D(i.TEXTURE_2D,bt,Jt,he[0].width,he[0].height);for(let nt=0,ct=he.length;nt<ct;nt++)zt=he[nt],ae?q&&e.texSubImage2D(i.TEXTURE_2D,nt,0,0,zt.width,zt.height,Ut,Zt,zt.data):e.texImage2D(i.TEXTURE_2D,nt,Jt,zt.width,zt.height,0,Ut,Zt,zt.data);R.generateMipmaps=!1}else ae?(we&&e.texStorage2D(i.TEXTURE_2D,bt,Jt,gt.width,gt.height),q&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,gt.width,gt.height,Ut,Zt,gt.data)):e.texImage2D(i.TEXTURE_2D,0,Jt,gt.width,gt.height,0,Ut,Zt,gt.data);else if(R.isCompressedTexture)if(R.isCompressedArrayTexture){ae&&we&&e.texStorage3D(i.TEXTURE_2D_ARRAY,bt,Jt,he[0].width,he[0].height,gt.depth);for(let nt=0,ct=he.length;nt<ct;nt++)if(zt=he[nt],R.format!==Pn)if(Ut!==null)if(ae){if(q)if(R.layerUpdates.size>0){const At=Lh(zt.width,zt.height,R.format,R.type);for(const Et of R.layerUpdates){const ee=zt.data.subarray(Et*At/zt.data.BYTES_PER_ELEMENT,(Et+1)*At/zt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,nt,0,0,Et,zt.width,zt.height,1,Ut,ee)}R.clearLayerUpdates()}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,nt,0,0,0,zt.width,zt.height,gt.depth,Ut,zt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,nt,Jt,zt.width,zt.height,gt.depth,0,zt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ae?q&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,nt,0,0,0,zt.width,zt.height,gt.depth,Ut,Zt,zt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,nt,Jt,zt.width,zt.height,gt.depth,0,Ut,Zt,zt.data)}else{ae&&we&&e.texStorage2D(i.TEXTURE_2D,bt,Jt,he[0].width,he[0].height);for(let nt=0,ct=he.length;nt<ct;nt++)zt=he[nt],R.format!==Pn?Ut!==null?ae?q&&e.compressedTexSubImage2D(i.TEXTURE_2D,nt,0,0,zt.width,zt.height,Ut,zt.data):e.compressedTexImage2D(i.TEXTURE_2D,nt,Jt,zt.width,zt.height,0,zt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ae?q&&e.texSubImage2D(i.TEXTURE_2D,nt,0,0,zt.width,zt.height,Ut,Zt,zt.data):e.texImage2D(i.TEXTURE_2D,nt,Jt,zt.width,zt.height,0,Ut,Zt,zt.data)}else if(R.isDataArrayTexture)if(ae){if(we&&e.texStorage3D(i.TEXTURE_2D_ARRAY,bt,Jt,gt.width,gt.height,gt.depth),q)if(R.layerUpdates.size>0){const nt=Lh(gt.width,gt.height,R.format,R.type);for(const ct of R.layerUpdates){const At=gt.data.subarray(ct*nt/gt.data.BYTES_PER_ELEMENT,(ct+1)*nt/gt.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ct,gt.width,gt.height,1,Ut,Zt,At)}R.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,gt.width,gt.height,gt.depth,Ut,Zt,gt.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,Jt,gt.width,gt.height,gt.depth,0,Ut,Zt,gt.data);else if(R.isData3DTexture)ae?(we&&e.texStorage3D(i.TEXTURE_3D,bt,Jt,gt.width,gt.height,gt.depth),q&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,gt.width,gt.height,gt.depth,Ut,Zt,gt.data)):e.texImage3D(i.TEXTURE_3D,0,Jt,gt.width,gt.height,gt.depth,0,Ut,Zt,gt.data);else if(R.isFramebufferTexture){if(we)if(ae)e.texStorage2D(i.TEXTURE_2D,bt,Jt,gt.width,gt.height);else{let nt=gt.width,ct=gt.height;for(let At=0;At<bt;At++)e.texImage2D(i.TEXTURE_2D,At,Jt,nt,ct,0,Ut,Zt,null),nt>>=1,ct>>=1}}else if(he.length>0){if(ae&&we){const nt=It(he[0]);e.texStorage2D(i.TEXTURE_2D,bt,Jt,nt.width,nt.height)}for(let nt=0,ct=he.length;nt<ct;nt++)zt=he[nt],ae?q&&e.texSubImage2D(i.TEXTURE_2D,nt,0,0,Ut,Zt,zt):e.texImage2D(i.TEXTURE_2D,nt,Jt,Ut,Zt,zt);R.generateMipmaps=!1}else if(ae){if(we){const nt=It(gt);e.texStorage2D(i.TEXTURE_2D,bt,Jt,nt.width,nt.height)}q&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,Ut,Zt,gt)}else e.texImage2D(i.TEXTURE_2D,0,Jt,Ut,Zt,gt);g(R)&&h(ot),Gt.__version=rt.version,R.onUpdate&&R.onUpdate(R)}D.__version=R.version}function j(D,R,J){if(R.image.length!==6)return;const ot=it(D,R),ut=R.source;e.bindTexture(i.TEXTURE_CUBE_MAP,D.__webglTexture,i.TEXTURE0+J);const rt=n.get(ut);if(ut.version!==rt.__version||ot===!0){e.activeTexture(i.TEXTURE0+J);const Gt=de.getPrimaries(de.workingColorSpace),St=R.colorSpace===Ci?null:de.getPrimaries(R.colorSpace),Lt=R.colorSpace===Ci||Gt===St?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,R.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,R.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Lt);const ce=R.isCompressedTexture||R.image[0].isCompressedTexture,gt=R.image[0]&&R.image[0].isDataTexture,Ut=[];for(let ct=0;ct<6;ct++)!ce&&!gt?Ut[ct]=S(R.image[ct],!0,s.maxCubemapSize):Ut[ct]=gt?R.image[ct].image:R.image[ct],Ut[ct]=Yt(R,Ut[ct]);const Zt=Ut[0],Jt=a.convert(R.format,R.colorSpace),zt=a.convert(R.type),he=w(R.internalFormat,Jt,zt,R.colorSpace),ae=R.isVideoTexture!==!0,we=rt.__version===void 0||ot===!0,q=ut.dataReady;let bt=C(R,Zt);Q(i.TEXTURE_CUBE_MAP,R);let nt;if(ce){ae&&we&&e.texStorage2D(i.TEXTURE_CUBE_MAP,bt,he,Zt.width,Zt.height);for(let ct=0;ct<6;ct++){nt=Ut[ct].mipmaps;for(let At=0;At<nt.length;At++){const Et=nt[At];R.format!==Pn?Jt!==null?ae?q&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,At,0,0,Et.width,Et.height,Jt,Et.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,At,he,Et.width,Et.height,0,Et.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):ae?q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,At,0,0,Et.width,Et.height,Jt,zt,Et.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,At,he,Et.width,Et.height,0,Jt,zt,Et.data)}}}else{if(nt=R.mipmaps,ae&&we){nt.length>0&&bt++;const ct=It(Ut[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,bt,he,ct.width,ct.height)}for(let ct=0;ct<6;ct++)if(gt){ae?q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0,0,0,Ut[ct].width,Ut[ct].height,Jt,zt,Ut[ct].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0,he,Ut[ct].width,Ut[ct].height,0,Jt,zt,Ut[ct].data);for(let At=0;At<nt.length;At++){const ee=nt[At].image[ct].image;ae?q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,At+1,0,0,ee.width,ee.height,Jt,zt,ee.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,At+1,he,ee.width,ee.height,0,Jt,zt,ee.data)}}else{ae?q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0,0,0,Jt,zt,Ut[ct]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0,he,Jt,zt,Ut[ct]);for(let At=0;At<nt.length;At++){const Et=nt[At];ae?q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,At+1,0,0,Jt,zt,Et.image[ct]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ct,At+1,he,Jt,zt,Et.image[ct])}}}g(R)&&h(i.TEXTURE_CUBE_MAP),rt.__version=ut.version,R.onUpdate&&R.onUpdate(R)}D.__version=R.version}function ht(D,R,J,ot,ut,rt){const Gt=a.convert(J.format,J.colorSpace),St=a.convert(J.type),Lt=w(J.internalFormat,Gt,St,J.colorSpace),ce=n.get(R),gt=n.get(J);if(gt.__renderTarget=R,!ce.__hasExternalTextures){const Ut=Math.max(1,R.width>>rt),Zt=Math.max(1,R.height>>rt);ut===i.TEXTURE_3D||ut===i.TEXTURE_2D_ARRAY?e.texImage3D(ut,rt,Lt,Ut,Zt,R.depth,0,Gt,St,null):e.texImage2D(ut,rt,Lt,Ut,Zt,0,Gt,St,null)}e.bindFramebuffer(i.FRAMEBUFFER,D),Dt(R)?r.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ot,ut,gt.__webglTexture,0,mt(R)):(ut===i.TEXTURE_2D||ut>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ut<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,ot,ut,gt.__webglTexture,rt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function dt(D,R,J){if(i.bindRenderbuffer(i.RENDERBUFFER,D),R.depthBuffer){const ot=R.depthTexture,ut=ot&&ot.isDepthTexture?ot.type:null,rt=y(R.stencilBuffer,ut),Gt=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,St=mt(R);Dt(R)?r.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,St,rt,R.width,R.height):J?i.renderbufferStorageMultisample(i.RENDERBUFFER,St,rt,R.width,R.height):i.renderbufferStorage(i.RENDERBUFFER,rt,R.width,R.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Gt,i.RENDERBUFFER,D)}else{const ot=R.textures;for(let ut=0;ut<ot.length;ut++){const rt=ot[ut],Gt=a.convert(rt.format,rt.colorSpace),St=a.convert(rt.type),Lt=w(rt.internalFormat,Gt,St,rt.colorSpace),ce=mt(R);J&&Dt(R)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,ce,Lt,R.width,R.height):Dt(R)?r.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ce,Lt,R.width,R.height):i.renderbufferStorage(i.RENDERBUFFER,Lt,R.width,R.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Rt(D,R){if(R&&R.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(i.FRAMEBUFFER,D),!(R.depthTexture&&R.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const ot=n.get(R.depthTexture);ot.__renderTarget=R,(!ot.__webglTexture||R.depthTexture.image.width!==R.width||R.depthTexture.image.height!==R.height)&&(R.depthTexture.image.width=R.width,R.depthTexture.image.height=R.height,R.depthTexture.needsUpdate=!0),z(R.depthTexture,0);const ut=ot.__webglTexture,rt=mt(R);if(R.depthTexture.format===Bs)Dt(R)?r.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,ut,0,rt):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,ut,0);else if(R.depthTexture.format===Vs)Dt(R)?r.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,ut,0,rt):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,ut,0);else throw new Error("Unknown depthTexture format")}function Pt(D){const R=n.get(D),J=D.isWebGLCubeRenderTarget===!0;if(R.__boundDepthTexture!==D.depthTexture){const ot=D.depthTexture;if(R.__depthDisposeCallback&&R.__depthDisposeCallback(),ot){const ut=()=>{delete R.__boundDepthTexture,delete R.__depthDisposeCallback,ot.removeEventListener("dispose",ut)};ot.addEventListener("dispose",ut),R.__depthDisposeCallback=ut}R.__boundDepthTexture=ot}if(D.depthTexture&&!R.__autoAllocateDepthBuffer){if(J)throw new Error("target.depthTexture not supported in Cube render targets");Rt(R.__webglFramebuffer,D)}else if(J){R.__webglDepthbuffer=[];for(let ot=0;ot<6;ot++)if(e.bindFramebuffer(i.FRAMEBUFFER,R.__webglFramebuffer[ot]),R.__webglDepthbuffer[ot]===void 0)R.__webglDepthbuffer[ot]=i.createRenderbuffer(),dt(R.__webglDepthbuffer[ot],D,!1);else{const ut=D.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,rt=R.__webglDepthbuffer[ot];i.bindRenderbuffer(i.RENDERBUFFER,rt),i.framebufferRenderbuffer(i.FRAMEBUFFER,ut,i.RENDERBUFFER,rt)}}else if(e.bindFramebuffer(i.FRAMEBUFFER,R.__webglFramebuffer),R.__webglDepthbuffer===void 0)R.__webglDepthbuffer=i.createRenderbuffer(),dt(R.__webglDepthbuffer,D,!1);else{const ot=D.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ut=R.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ut),i.framebufferRenderbuffer(i.FRAMEBUFFER,ot,i.RENDERBUFFER,ut)}e.bindFramebuffer(i.FRAMEBUFFER,null)}function kt(D,R,J){const ot=n.get(D);R!==void 0&&ht(ot.__webglFramebuffer,D,D.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),J!==void 0&&Pt(D)}function Kt(D){const R=D.texture,J=n.get(D),ot=n.get(R);D.addEventListener("dispose",T);const ut=D.textures,rt=D.isWebGLCubeRenderTarget===!0,Gt=ut.length>1;if(Gt||(ot.__webglTexture===void 0&&(ot.__webglTexture=i.createTexture()),ot.__version=R.version,o.memory.textures++),rt){J.__webglFramebuffer=[];for(let St=0;St<6;St++)if(R.mipmaps&&R.mipmaps.length>0){J.__webglFramebuffer[St]=[];for(let Lt=0;Lt<R.mipmaps.length;Lt++)J.__webglFramebuffer[St][Lt]=i.createFramebuffer()}else J.__webglFramebuffer[St]=i.createFramebuffer()}else{if(R.mipmaps&&R.mipmaps.length>0){J.__webglFramebuffer=[];for(let St=0;St<R.mipmaps.length;St++)J.__webglFramebuffer[St]=i.createFramebuffer()}else J.__webglFramebuffer=i.createFramebuffer();if(Gt)for(let St=0,Lt=ut.length;St<Lt;St++){const ce=n.get(ut[St]);ce.__webglTexture===void 0&&(ce.__webglTexture=i.createTexture(),o.memory.textures++)}if(D.samples>0&&Dt(D)===!1){J.__webglMultisampledFramebuffer=i.createFramebuffer(),J.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,J.__webglMultisampledFramebuffer);for(let St=0;St<ut.length;St++){const Lt=ut[St];J.__webglColorRenderbuffer[St]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,J.__webglColorRenderbuffer[St]);const ce=a.convert(Lt.format,Lt.colorSpace),gt=a.convert(Lt.type),Ut=w(Lt.internalFormat,ce,gt,Lt.colorSpace,D.isXRRenderTarget===!0),Zt=mt(D);i.renderbufferStorageMultisample(i.RENDERBUFFER,Zt,Ut,D.width,D.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+St,i.RENDERBUFFER,J.__webglColorRenderbuffer[St])}i.bindRenderbuffer(i.RENDERBUFFER,null),D.depthBuffer&&(J.__webglDepthRenderbuffer=i.createRenderbuffer(),dt(J.__webglDepthRenderbuffer,D,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(rt){e.bindTexture(i.TEXTURE_CUBE_MAP,ot.__webglTexture),Q(i.TEXTURE_CUBE_MAP,R);for(let St=0;St<6;St++)if(R.mipmaps&&R.mipmaps.length>0)for(let Lt=0;Lt<R.mipmaps.length;Lt++)ht(J.__webglFramebuffer[St][Lt],D,R,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+St,Lt);else ht(J.__webglFramebuffer[St],D,R,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+St,0);g(R)&&h(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Gt){for(let St=0,Lt=ut.length;St<Lt;St++){const ce=ut[St],gt=n.get(ce);e.bindTexture(i.TEXTURE_2D,gt.__webglTexture),Q(i.TEXTURE_2D,ce),ht(J.__webglFramebuffer,D,ce,i.COLOR_ATTACHMENT0+St,i.TEXTURE_2D,0),g(ce)&&h(i.TEXTURE_2D)}e.unbindTexture()}else{let St=i.TEXTURE_2D;if((D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(St=D.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(St,ot.__webglTexture),Q(St,R),R.mipmaps&&R.mipmaps.length>0)for(let Lt=0;Lt<R.mipmaps.length;Lt++)ht(J.__webglFramebuffer[Lt],D,R,i.COLOR_ATTACHMENT0,St,Lt);else ht(J.__webglFramebuffer,D,R,i.COLOR_ATTACHMENT0,St,0);g(R)&&h(St),e.unbindTexture()}D.depthBuffer&&Pt(D)}function st(D){const R=D.textures;for(let J=0,ot=R.length;J<ot;J++){const ut=R[J];if(g(ut)){const rt=b(D),Gt=n.get(ut).__webglTexture;e.bindTexture(rt,Gt),h(rt),e.unbindTexture()}}}const pt=[],O=[];function Ft(D){if(D.samples>0){if(Dt(D)===!1){const R=D.textures,J=D.width,ot=D.height;let ut=i.COLOR_BUFFER_BIT;const rt=D.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Gt=n.get(D),St=R.length>1;if(St)for(let Lt=0;Lt<R.length;Lt++)e.bindFramebuffer(i.FRAMEBUFFER,Gt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Lt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,Gt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Lt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,Gt.__webglMultisampledFramebuffer),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,Gt.__webglFramebuffer);for(let Lt=0;Lt<R.length;Lt++){if(D.resolveDepthBuffer&&(D.depthBuffer&&(ut|=i.DEPTH_BUFFER_BIT),D.stencilBuffer&&D.resolveStencilBuffer&&(ut|=i.STENCIL_BUFFER_BIT)),St){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Gt.__webglColorRenderbuffer[Lt]);const ce=n.get(R[Lt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ce,0)}i.blitFramebuffer(0,0,J,ot,0,0,J,ot,ut,i.NEAREST),l===!0&&(pt.length=0,O.length=0,pt.push(i.COLOR_ATTACHMENT0+Lt),D.depthBuffer&&D.resolveDepthBuffer===!1&&(pt.push(rt),O.push(rt),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,O)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,pt))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),St)for(let Lt=0;Lt<R.length;Lt++){e.bindFramebuffer(i.FRAMEBUFFER,Gt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Lt,i.RENDERBUFFER,Gt.__webglColorRenderbuffer[Lt]);const ce=n.get(R[Lt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,Gt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Lt,i.TEXTURE_2D,ce,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,Gt.__webglMultisampledFramebuffer)}else if(D.depthBuffer&&D.resolveDepthBuffer===!1&&l){const R=D.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[R])}}}function mt(D){return Math.min(s.maxSamples,D.samples)}function Dt(D){const R=n.get(D);return D.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&R.__useRenderToTexture!==!1}function _t(D){const R=o.render.frame;d.get(D)!==R&&(d.set(D,R),D.update())}function Yt(D,R){const J=D.colorSpace,ot=D.format,ut=D.type;return D.isCompressedTexture===!0||D.isVideoTexture===!0||J!==Zs&&J!==Ci&&(de.getTransfer(J)===ye?(ot!==Pn||ut!==ui)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",J)),R}function It(D){return typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement?(c.width=D.naturalWidth||D.width,c.height=D.naturalHeight||D.height):typeof VideoFrame<"u"&&D instanceof VideoFrame?(c.width=D.displayWidth,c.height=D.displayHeight):(c.width=D.width,c.height=D.height),c}this.allocateTextureUnit=U,this.resetTextureUnits=N,this.setTexture2D=z,this.setTexture2DArray=L,this.setTexture3D=A,this.setTextureCube=E,this.rebindTextures=kt,this.setupRenderTarget=Kt,this.updateRenderTargetMipmap=st,this.updateMultisampleRenderTarget=Ft,this.setupDepthRenderbuffer=Pt,this.setupFrameBufferTexture=ht,this.useMultisampledRTT=Dt}function Ev(i,t){function e(n,s=Ci){let a;const o=de.getTransfer(s);if(n===ui)return i.UNSIGNED_BYTE;if(n===ac)return i.UNSIGNED_SHORT_4_4_4_4;if(n===oc)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Su)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Mu)return i.BYTE;if(n===yu)return i.SHORT;if(n===Ia)return i.UNSIGNED_SHORT;if(n===sc)return i.INT;if(n===ns)return i.UNSIGNED_INT;if(n===Gn)return i.FLOAT;if(n===ci)return i.HALF_FLOAT;if(n===bu)return i.ALPHA;if(n===wu)return i.RGB;if(n===Pn)return i.RGBA;if(n===Tu)return i.LUMINANCE;if(n===Eu)return i.LUMINANCE_ALPHA;if(n===Bs)return i.DEPTH_COMPONENT;if(n===Vs)return i.DEPTH_STENCIL;if(n===rc)return i.RED;if(n===lc)return i.RED_INTEGER;if(n===Cu)return i.RG;if(n===cc)return i.RG_INTEGER;if(n===hc)return i.RGBA_INTEGER;if(n===To||n===Eo||n===Co||n===Ao)if(o===ye)if(a=t.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(n===To)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Eo)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Co)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Ao)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=t.get("WEBGL_compressed_texture_s3tc"),a!==null){if(n===To)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Eo)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Co)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Ao)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===ul||n===fl||n===pl||n===ml)if(a=t.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(n===ul)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===fl)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===pl)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ml)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===gl||n===vl||n===xl)if(a=t.get("WEBGL_compressed_texture_etc"),a!==null){if(n===gl||n===vl)return o===ye?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(n===xl)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===_l||n===Ml||n===yl||n===Sl||n===bl||n===wl||n===Tl||n===El||n===Cl||n===Al||n===Rl||n===Pl||n===kl||n===Il)if(a=t.get("WEBGL_compressed_texture_astc"),a!==null){if(n===_l)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Ml)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===yl)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Sl)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===bl)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===wl)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Tl)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===El)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Cl)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Al)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Rl)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Pl)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===kl)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Il)return o===ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Ro||n===Ll||n===Dl)if(a=t.get("EXT_texture_compression_bptc"),a!==null){if(n===Ro)return o===ye?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Ll)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Dl)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Au||n===Bl||n===Nl||n===Ul)if(a=t.get("EXT_texture_compression_rgtc"),a!==null){if(n===Ro)return a.COMPRESSED_RED_RGTC1_EXT;if(n===Bl)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Nl)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Ul)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Gs?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}class Cv extends pn{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class re extends Oe{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Av={type:"move"};class Er{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new re,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new re,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new G,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new G),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new re,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new G,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new G),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,a=null,o=null;const r=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(const S of t.hand.values()){const g=e.getJointPose(S,n),h=this._getHandJoint(c,S);g!==null&&(h.matrix.fromArray(g.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,h.jointRadius=g.radius),h.visible=g!==null}const d=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],f=d.position.distanceTo(u.position),m=.02,p=.005;c.inputState.pinching&&f>m+p?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&f<=m-p&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(a=e.getPose(t.gripSpace,n),a!==null&&(l.matrix.fromArray(a.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,a.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(a.linearVelocity)):l.hasLinearVelocity=!1,a.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(a.angularVelocity)):l.hasAngularVelocity=!1));r!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&a!==null&&(s=a),s!==null&&(r.matrix.fromArray(s.transform.matrix),r.matrix.decompose(r.position,r.rotation,r.scale),r.matrixWorldNeedsUpdate=!0,s.linearVelocity?(r.hasLinearVelocity=!0,r.linearVelocity.copy(s.linearVelocity)):r.hasLinearVelocity=!1,s.angularVelocity?(r.hasAngularVelocity=!0,r.angularVelocity.copy(s.angularVelocity)):r.hasAngularVelocity=!1,this.dispatchEvent(Av)))}return r!==null&&(r.visible=s!==null),l!==null&&(l.visible=a!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new re;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const Rv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Pv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class kv{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,n){if(this.texture===null){const s=new Je,a=t.properties.get(s);a.__webglTexture=e.texture,(e.depthNear!=n.depthNear||e.depthFar!=n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=s}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Fe({vertexShader:Rv,fragmentShader:Pv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new F(new Xe(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Iv extends js{constructor(t,e){super();const n=this;let s=null,a=1,o=null,r="local-floor",l=1,c=null,d=null,u=null,f=null,m=null,p=null;const S=new kv,g=e.getContextAttributes();let h=null,b=null;const w=[],y=[],C=new ft;let v=null;const T=new pn;T.viewport=new be;const P=new pn;P.viewport=new be;const x=[T,P],M=new Cv;let _=null,N=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(W){let j=w[W];return j===void 0&&(j=new Er,w[W]=j),j.getTargetRaySpace()},this.getControllerGrip=function(W){let j=w[W];return j===void 0&&(j=new Er,w[W]=j),j.getGripSpace()},this.getHand=function(W){let j=w[W];return j===void 0&&(j=new Er,w[W]=j),j.getHandSpace()};function U(W){const j=y.indexOf(W.inputSource);if(j===-1)return;const ht=w[j];ht!==void 0&&(ht.update(W.inputSource,W.frame,c||o),ht.dispatchEvent({type:W.type,data:W.inputSource}))}function H(){s.removeEventListener("select",U),s.removeEventListener("selectstart",U),s.removeEventListener("selectend",U),s.removeEventListener("squeeze",U),s.removeEventListener("squeezestart",U),s.removeEventListener("squeezeend",U),s.removeEventListener("end",H),s.removeEventListener("inputsourceschange",z);for(let W=0;W<w.length;W++){const j=y[W];j!==null&&(y[W]=null,w[W].disconnect(j))}_=null,N=null,S.reset(),t.setRenderTarget(h),m=null,f=null,u=null,s=null,b=null,it.stop(),n.isPresenting=!1,t.setPixelRatio(v),t.setSize(C.width,C.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(W){a=W,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(W){r=W,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(W){c=W},this.getBaseLayer=function(){return f!==null?f:m},this.getBinding=function(){return u},this.getFrame=function(){return p},this.getSession=function(){return s},this.setSession=async function(W){if(s=W,s!==null){if(h=t.getRenderTarget(),s.addEventListener("select",U),s.addEventListener("selectstart",U),s.addEventListener("selectend",U),s.addEventListener("squeeze",U),s.addEventListener("squeezestart",U),s.addEventListener("squeezeend",U),s.addEventListener("end",H),s.addEventListener("inputsourceschange",z),g.xrCompatible!==!0&&await e.makeXRCompatible(),v=t.getPixelRatio(),t.getSize(C),s.renderState.layers===void 0){const j={antialias:g.antialias,alpha:!0,depth:g.depth,stencil:g.stencil,framebufferScaleFactor:a};m=new XRWebGLLayer(s,e,j),s.updateRenderState({baseLayer:m}),t.setPixelRatio(1),t.setSize(m.framebufferWidth,m.framebufferHeight,!1),b=new kn(m.framebufferWidth,m.framebufferHeight,{format:Pn,type:ui,colorSpace:t.outputColorSpace,stencilBuffer:g.stencil})}else{let j=null,ht=null,dt=null;g.depth&&(dt=g.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,j=g.stencil?Vs:Bs,ht=g.stencil?Gs:ns);const Rt={colorFormat:e.RGBA8,depthFormat:dt,scaleFactor:a};u=new XRWebGLBinding(s,e),f=u.createProjectionLayer(Rt),s.updateRenderState({layers:[f]}),t.setPixelRatio(1),t.setSize(f.textureWidth,f.textureHeight,!1),b=new kn(f.textureWidth,f.textureHeight,{format:Pn,type:ui,depthTexture:new Hu(f.textureWidth,f.textureHeight,ht,void 0,void 0,void 0,void 0,void 0,void 0,j),stencilBuffer:g.stencil,colorSpace:t.outputColorSpace,samples:g.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(r),it.setContext(s),it.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return S.getDepthTexture()};function z(W){for(let j=0;j<W.removed.length;j++){const ht=W.removed[j],dt=y.indexOf(ht);dt>=0&&(y[dt]=null,w[dt].disconnect(ht))}for(let j=0;j<W.added.length;j++){const ht=W.added[j];let dt=y.indexOf(ht);if(dt===-1){for(let Pt=0;Pt<w.length;Pt++)if(Pt>=y.length){y.push(ht),dt=Pt;break}else if(y[Pt]===null){y[Pt]=ht,dt=Pt;break}if(dt===-1)break}const Rt=w[dt];Rt&&Rt.connect(ht)}}const L=new G,A=new G;function E(W,j,ht){L.setFromMatrixPosition(j.matrixWorld),A.setFromMatrixPosition(ht.matrixWorld);const dt=L.distanceTo(A),Rt=j.projectionMatrix.elements,Pt=ht.projectionMatrix.elements,kt=Rt[14]/(Rt[10]-1),Kt=Rt[14]/(Rt[10]+1),st=(Rt[9]+1)/Rt[5],pt=(Rt[9]-1)/Rt[5],O=(Rt[8]-1)/Rt[0],Ft=(Pt[8]+1)/Pt[0],mt=kt*O,Dt=kt*Ft,_t=dt/(-O+Ft),Yt=_t*-O;if(j.matrixWorld.decompose(W.position,W.quaternion,W.scale),W.translateX(Yt),W.translateZ(_t),W.matrixWorld.compose(W.position,W.quaternion,W.scale),W.matrixWorldInverse.copy(W.matrixWorld).invert(),Rt[10]===-1)W.projectionMatrix.copy(j.projectionMatrix),W.projectionMatrixInverse.copy(j.projectionMatrixInverse);else{const It=kt+_t,D=Kt+_t,R=mt-Yt,J=Dt+(dt-Yt),ot=st*Kt/D*It,ut=pt*Kt/D*It;W.projectionMatrix.makePerspective(R,J,ot,ut,It,D),W.projectionMatrixInverse.copy(W.projectionMatrix).invert()}}function I(W,j){j===null?W.matrixWorld.copy(W.matrix):W.matrixWorld.multiplyMatrices(j.matrixWorld,W.matrix),W.matrixWorldInverse.copy(W.matrixWorld).invert()}this.updateCamera=function(W){if(s===null)return;let j=W.near,ht=W.far;S.texture!==null&&(S.depthNear>0&&(j=S.depthNear),S.depthFar>0&&(ht=S.depthFar)),M.near=P.near=T.near=j,M.far=P.far=T.far=ht,(_!==M.near||N!==M.far)&&(s.updateRenderState({depthNear:M.near,depthFar:M.far}),_=M.near,N=M.far),T.layers.mask=W.layers.mask|2,P.layers.mask=W.layers.mask|4,M.layers.mask=T.layers.mask|P.layers.mask;const dt=W.parent,Rt=M.cameras;I(M,dt);for(let Pt=0;Pt<Rt.length;Pt++)I(Rt[Pt],dt);Rt.length===2?E(M,T,P):M.projectionMatrix.copy(T.projectionMatrix),V(W,M,dt)};function V(W,j,ht){ht===null?W.matrix.copy(j.matrixWorld):(W.matrix.copy(ht.matrixWorld),W.matrix.invert(),W.matrix.multiply(j.matrixWorld)),W.matrix.decompose(W.position,W.quaternion,W.scale),W.updateMatrixWorld(!0),W.projectionMatrix.copy(j.projectionMatrix),W.projectionMatrixInverse.copy(j.projectionMatrixInverse),W.isPerspectiveCamera&&(W.fov=La*2*Math.atan(1/W.projectionMatrix.elements[5]),W.zoom=1)}this.getCamera=function(){return M},this.getFoveation=function(){if(!(f===null&&m===null))return l},this.setFoveation=function(W){l=W,f!==null&&(f.fixedFoveation=W),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=W)},this.hasDepthSensing=function(){return S.texture!==null},this.getDepthSensingMesh=function(){return S.getMesh(M)};let $=null;function Q(W,j){if(d=j.getViewerPose(c||o),p=j,d!==null){const ht=d.views;m!==null&&(t.setRenderTargetFramebuffer(b,m.framebuffer),t.setRenderTarget(b));let dt=!1;ht.length!==M.cameras.length&&(M.cameras.length=0,dt=!0);for(let Pt=0;Pt<ht.length;Pt++){const kt=ht[Pt];let Kt=null;if(m!==null)Kt=m.getViewport(kt);else{const pt=u.getViewSubImage(f,kt);Kt=pt.viewport,Pt===0&&(t.setRenderTargetTextures(b,pt.colorTexture,f.ignoreDepthValues?void 0:pt.depthStencilTexture),t.setRenderTarget(b))}let st=x[Pt];st===void 0&&(st=new pn,st.layers.enable(Pt),st.viewport=new be,x[Pt]=st),st.matrix.fromArray(kt.transform.matrix),st.matrix.decompose(st.position,st.quaternion,st.scale),st.projectionMatrix.fromArray(kt.projectionMatrix),st.projectionMatrixInverse.copy(st.projectionMatrix).invert(),st.viewport.set(Kt.x,Kt.y,Kt.width,Kt.height),Pt===0&&(M.matrix.copy(st.matrix),M.matrix.decompose(M.position,M.quaternion,M.scale)),dt===!0&&M.cameras.push(st)}const Rt=s.enabledFeatures;if(Rt&&Rt.includes("depth-sensing")){const Pt=u.getDepthInformation(ht[0]);Pt&&Pt.isValid&&Pt.texture&&S.init(t,Pt,s.renderState)}}for(let ht=0;ht<w.length;ht++){const dt=y[ht],Rt=w[ht];dt!==null&&Rt!==void 0&&Rt.update(dt,j,c||o)}$&&$(W,j),j.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:j}),p=null}const it=new Ou;it.setAnimationLoop(Q),this.setAnimationLoop=function(W){$=W},this.dispose=function(){}}}const Gi=new Kn,Lv=new _e;function Dv(i,t){function e(g,h){g.matrixAutoUpdate===!0&&g.updateMatrix(),h.value.copy(g.matrix)}function n(g,h){h.color.getRGB(g.fogColor.value,Uu(i)),h.isFog?(g.fogNear.value=h.near,g.fogFar.value=h.far):h.isFogExp2&&(g.fogDensity.value=h.density)}function s(g,h,b,w,y){h.isMeshBasicMaterial||h.isMeshLambertMaterial?a(g,h):h.isMeshToonMaterial?(a(g,h),u(g,h)):h.isMeshPhongMaterial?(a(g,h),d(g,h)):h.isMeshStandardMaterial?(a(g,h),f(g,h),h.isMeshPhysicalMaterial&&m(g,h,y)):h.isMeshMatcapMaterial?(a(g,h),p(g,h)):h.isMeshDepthMaterial?a(g,h):h.isMeshDistanceMaterial?(a(g,h),S(g,h)):h.isMeshNormalMaterial?a(g,h):h.isLineBasicMaterial?(o(g,h),h.isLineDashedMaterial&&r(g,h)):h.isPointsMaterial?l(g,h,b,w):h.isSpriteMaterial?c(g,h):h.isShadowMaterial?(g.color.value.copy(h.color),g.opacity.value=h.opacity):h.isShaderMaterial&&(h.uniformsNeedUpdate=!1)}function a(g,h){g.opacity.value=h.opacity,h.color&&g.diffuse.value.copy(h.color),h.emissive&&g.emissive.value.copy(h.emissive).multiplyScalar(h.emissiveIntensity),h.map&&(g.map.value=h.map,e(h.map,g.mapTransform)),h.alphaMap&&(g.alphaMap.value=h.alphaMap,e(h.alphaMap,g.alphaMapTransform)),h.bumpMap&&(g.bumpMap.value=h.bumpMap,e(h.bumpMap,g.bumpMapTransform),g.bumpScale.value=h.bumpScale,h.side===sn&&(g.bumpScale.value*=-1)),h.normalMap&&(g.normalMap.value=h.normalMap,e(h.normalMap,g.normalMapTransform),g.normalScale.value.copy(h.normalScale),h.side===sn&&g.normalScale.value.negate()),h.displacementMap&&(g.displacementMap.value=h.displacementMap,e(h.displacementMap,g.displacementMapTransform),g.displacementScale.value=h.displacementScale,g.displacementBias.value=h.displacementBias),h.emissiveMap&&(g.emissiveMap.value=h.emissiveMap,e(h.emissiveMap,g.emissiveMapTransform)),h.specularMap&&(g.specularMap.value=h.specularMap,e(h.specularMap,g.specularMapTransform)),h.alphaTest>0&&(g.alphaTest.value=h.alphaTest);const b=t.get(h),w=b.envMap,y=b.envMapRotation;w&&(g.envMap.value=w,Gi.copy(y),Gi.x*=-1,Gi.y*=-1,Gi.z*=-1,w.isCubeTexture&&w.isRenderTargetTexture===!1&&(Gi.y*=-1,Gi.z*=-1),g.envMapRotation.value.setFromMatrix4(Lv.makeRotationFromEuler(Gi)),g.flipEnvMap.value=w.isCubeTexture&&w.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=h.reflectivity,g.ior.value=h.ior,g.refractionRatio.value=h.refractionRatio),h.lightMap&&(g.lightMap.value=h.lightMap,g.lightMapIntensity.value=h.lightMapIntensity,e(h.lightMap,g.lightMapTransform)),h.aoMap&&(g.aoMap.value=h.aoMap,g.aoMapIntensity.value=h.aoMapIntensity,e(h.aoMap,g.aoMapTransform))}function o(g,h){g.diffuse.value.copy(h.color),g.opacity.value=h.opacity,h.map&&(g.map.value=h.map,e(h.map,g.mapTransform))}function r(g,h){g.dashSize.value=h.dashSize,g.totalSize.value=h.dashSize+h.gapSize,g.scale.value=h.scale}function l(g,h,b,w){g.diffuse.value.copy(h.color),g.opacity.value=h.opacity,g.size.value=h.size*b,g.scale.value=w*.5,h.map&&(g.map.value=h.map,e(h.map,g.uvTransform)),h.alphaMap&&(g.alphaMap.value=h.alphaMap,e(h.alphaMap,g.alphaMapTransform)),h.alphaTest>0&&(g.alphaTest.value=h.alphaTest)}function c(g,h){g.diffuse.value.copy(h.color),g.opacity.value=h.opacity,g.rotation.value=h.rotation,h.map&&(g.map.value=h.map,e(h.map,g.mapTransform)),h.alphaMap&&(g.alphaMap.value=h.alphaMap,e(h.alphaMap,g.alphaMapTransform)),h.alphaTest>0&&(g.alphaTest.value=h.alphaTest)}function d(g,h){g.specular.value.copy(h.specular),g.shininess.value=Math.max(h.shininess,1e-4)}function u(g,h){h.gradientMap&&(g.gradientMap.value=h.gradientMap)}function f(g,h){g.metalness.value=h.metalness,h.metalnessMap&&(g.metalnessMap.value=h.metalnessMap,e(h.metalnessMap,g.metalnessMapTransform)),g.roughness.value=h.roughness,h.roughnessMap&&(g.roughnessMap.value=h.roughnessMap,e(h.roughnessMap,g.roughnessMapTransform)),h.envMap&&(g.envMapIntensity.value=h.envMapIntensity)}function m(g,h,b){g.ior.value=h.ior,h.sheen>0&&(g.sheenColor.value.copy(h.sheenColor).multiplyScalar(h.sheen),g.sheenRoughness.value=h.sheenRoughness,h.sheenColorMap&&(g.sheenColorMap.value=h.sheenColorMap,e(h.sheenColorMap,g.sheenColorMapTransform)),h.sheenRoughnessMap&&(g.sheenRoughnessMap.value=h.sheenRoughnessMap,e(h.sheenRoughnessMap,g.sheenRoughnessMapTransform))),h.clearcoat>0&&(g.clearcoat.value=h.clearcoat,g.clearcoatRoughness.value=h.clearcoatRoughness,h.clearcoatMap&&(g.clearcoatMap.value=h.clearcoatMap,e(h.clearcoatMap,g.clearcoatMapTransform)),h.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=h.clearcoatRoughnessMap,e(h.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),h.clearcoatNormalMap&&(g.clearcoatNormalMap.value=h.clearcoatNormalMap,e(h.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(h.clearcoatNormalScale),h.side===sn&&g.clearcoatNormalScale.value.negate())),h.dispersion>0&&(g.dispersion.value=h.dispersion),h.iridescence>0&&(g.iridescence.value=h.iridescence,g.iridescenceIOR.value=h.iridescenceIOR,g.iridescenceThicknessMinimum.value=h.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=h.iridescenceThicknessRange[1],h.iridescenceMap&&(g.iridescenceMap.value=h.iridescenceMap,e(h.iridescenceMap,g.iridescenceMapTransform)),h.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=h.iridescenceThicknessMap,e(h.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),h.transmission>0&&(g.transmission.value=h.transmission,g.transmissionSamplerMap.value=b.texture,g.transmissionSamplerSize.value.set(b.width,b.height),h.transmissionMap&&(g.transmissionMap.value=h.transmissionMap,e(h.transmissionMap,g.transmissionMapTransform)),g.thickness.value=h.thickness,h.thicknessMap&&(g.thicknessMap.value=h.thicknessMap,e(h.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=h.attenuationDistance,g.attenuationColor.value.copy(h.attenuationColor)),h.anisotropy>0&&(g.anisotropyVector.value.set(h.anisotropy*Math.cos(h.anisotropyRotation),h.anisotropy*Math.sin(h.anisotropyRotation)),h.anisotropyMap&&(g.anisotropyMap.value=h.anisotropyMap,e(h.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=h.specularIntensity,g.specularColor.value.copy(h.specularColor),h.specularColorMap&&(g.specularColorMap.value=h.specularColorMap,e(h.specularColorMap,g.specularColorMapTransform)),h.specularIntensityMap&&(g.specularIntensityMap.value=h.specularIntensityMap,e(h.specularIntensityMap,g.specularIntensityMapTransform))}function p(g,h){h.matcap&&(g.matcap.value=h.matcap)}function S(g,h){const b=t.get(h).light;g.referencePosition.value.setFromMatrixPosition(b.matrixWorld),g.nearDistance.value=b.shadow.camera.near,g.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Bv(i,t,e,n){let s={},a={},o=[];const r=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(b,w){const y=w.program;n.uniformBlockBinding(b,y)}function c(b,w){let y=s[b.id];y===void 0&&(p(b),y=d(b),s[b.id]=y,b.addEventListener("dispose",g));const C=w.program;n.updateUBOMapping(b,C);const v=t.render.frame;a[b.id]!==v&&(f(b),a[b.id]=v)}function d(b){const w=u();b.__bindingPointIndex=w;const y=i.createBuffer(),C=b.__size,v=b.usage;return i.bindBuffer(i.UNIFORM_BUFFER,y),i.bufferData(i.UNIFORM_BUFFER,C,v),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,w,y),y}function u(){for(let b=0;b<r;b++)if(o.indexOf(b)===-1)return o.push(b),b;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(b){const w=s[b.id],y=b.uniforms,C=b.__cache;i.bindBuffer(i.UNIFORM_BUFFER,w);for(let v=0,T=y.length;v<T;v++){const P=Array.isArray(y[v])?y[v]:[y[v]];for(let x=0,M=P.length;x<M;x++){const _=P[x];if(m(_,v,x,C)===!0){const N=_.__offset,U=Array.isArray(_.value)?_.value:[_.value];let H=0;for(let z=0;z<U.length;z++){const L=U[z],A=S(L);typeof L=="number"||typeof L=="boolean"?(_.__data[0]=L,i.bufferSubData(i.UNIFORM_BUFFER,N+H,_.__data)):L.isMatrix3?(_.__data[0]=L.elements[0],_.__data[1]=L.elements[1],_.__data[2]=L.elements[2],_.__data[3]=0,_.__data[4]=L.elements[3],_.__data[5]=L.elements[4],_.__data[6]=L.elements[5],_.__data[7]=0,_.__data[8]=L.elements[6],_.__data[9]=L.elements[7],_.__data[10]=L.elements[8],_.__data[11]=0):(L.toArray(_.__data,H),H+=A.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,N,_.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function m(b,w,y,C){const v=b.value,T=w+"_"+y;if(C[T]===void 0)return typeof v=="number"||typeof v=="boolean"?C[T]=v:C[T]=v.clone(),!0;{const P=C[T];if(typeof v=="number"||typeof v=="boolean"){if(P!==v)return C[T]=v,!0}else if(P.equals(v)===!1)return P.copy(v),!0}return!1}function p(b){const w=b.uniforms;let y=0;const C=16;for(let T=0,P=w.length;T<P;T++){const x=Array.isArray(w[T])?w[T]:[w[T]];for(let M=0,_=x.length;M<_;M++){const N=x[M],U=Array.isArray(N.value)?N.value:[N.value];for(let H=0,z=U.length;H<z;H++){const L=U[H],A=S(L),E=y%C,I=E%A.boundary,V=E+I;y+=I,V!==0&&C-V<A.storage&&(y+=C-V),N.__data=new Float32Array(A.storage/Float32Array.BYTES_PER_ELEMENT),N.__offset=y,y+=A.storage}}}const v=y%C;return v>0&&(y+=C-v),b.__size=y,b.__cache={},this}function S(b){const w={boundary:0,storage:0};return typeof b=="number"||typeof b=="boolean"?(w.boundary=4,w.storage=4):b.isVector2?(w.boundary=8,w.storage=8):b.isVector3||b.isColor?(w.boundary=16,w.storage=12):b.isVector4?(w.boundary=16,w.storage=16):b.isMatrix3?(w.boundary=48,w.storage=48):b.isMatrix4?(w.boundary=64,w.storage=64):b.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",b),w}function g(b){const w=b.target;w.removeEventListener("dispose",g);const y=o.indexOf(w.__bindingPointIndex);o.splice(y,1),i.deleteBuffer(s[w.id]),delete s[w.id],delete a[w.id]}function h(){for(const b in s)i.deleteBuffer(s[b]);o=[],s={},a={}}return{bind:l,update:c,dispose:h}}class Nv{constructor(t={}){const{canvas:e=Tp(),context:n=null,depth:s=!0,stencil:a=!1,alpha:o=!1,antialias:r=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:d="default",failIfMajorPerformanceCaveat:u=!1,reverseDepthBuffer:f=!1}=t;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=o;const p=new Uint32Array(4),S=new Int32Array(4);let g=null,h=null;const b=[],w=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=qe,this.toneMapping=Ai,this.toneMappingExposure=1;const y=this;let C=!1,v=0,T=0,P=null,x=-1,M=null;const _=new be,N=new be;let U=null;const H=new Tt(0);let z=0,L=e.width,A=e.height,E=1,I=null,V=null;const $=new be(0,0,L,A),Q=new be(0,0,L,A);let it=!1;const W=new pc;let j=!1,ht=!1;const dt=new _e,Rt=new _e,Pt=new G,kt=new be,Kt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let st=!1;function pt(){return P===null?E:1}let O=n;function Ft(k,K){return e.getContext(k,K)}try{const k={alpha:!0,depth:s,stencil:a,antialias:r,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:d,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${ec}`),e.addEventListener("webglcontextlost",ct,!1),e.addEventListener("webglcontextrestored",At,!1),e.addEventListener("webglcontextcreationerror",Et,!1),O===null){const K="webgl2";if(O=Ft(K,k),O===null)throw Ft(K)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(k){throw console.error("THREE.WebGLRenderer: "+k.message),k}let mt,Dt,_t,Yt,It,D,R,J,ot,ut,rt,Gt,St,Lt,ce,gt,Ut,Zt,Jt,zt,he,ae,we,q;function bt(){mt=new Hg(O),mt.init(),ae=new Ev(O,mt),Dt=new Bg(O,mt,t,ae),_t=new bv(O,mt),Dt.reverseDepthBuffer&&f&&_t.buffers.depth.setReversed(!0),Yt=new $g(O),It=new lv,D=new Tv(O,mt,_t,It,Dt,ae,Yt),R=new Ug(y),J=new Og(y),ot=new jp(O),we=new Lg(O,ot),ut=new Gg(O,ot,Yt,we),rt=new Xg(O,ut,ot,Yt),Jt=new Wg(O,Dt,D),gt=new Ng(It),Gt=new rv(y,R,J,mt,Dt,we,gt),St=new Dv(y,It),Lt=new hv,ce=new gv(mt),Zt=new Ig(y,R,J,_t,rt,m,l),Ut=new yv(y,rt,Dt),q=new Bv(O,Yt,Dt,_t),zt=new Dg(O,mt,Yt),he=new Vg(O,mt,Yt),Yt.programs=Gt.programs,y.capabilities=Dt,y.extensions=mt,y.properties=It,y.renderLists=Lt,y.shadowMap=Ut,y.state=_t,y.info=Yt}bt();const nt=new Iv(y,O);this.xr=nt,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){const k=mt.get("WEBGL_lose_context");k&&k.loseContext()},this.forceContextRestore=function(){const k=mt.get("WEBGL_lose_context");k&&k.restoreContext()},this.getPixelRatio=function(){return E},this.setPixelRatio=function(k){k!==void 0&&(E=k,this.setSize(L,A,!1))},this.getSize=function(k){return k.set(L,A)},this.setSize=function(k,K,tt=!0){if(nt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}L=k,A=K,e.width=Math.floor(k*E),e.height=Math.floor(K*E),tt===!0&&(e.style.width=k+"px",e.style.height=K+"px"),this.setViewport(0,0,k,K)},this.getDrawingBufferSize=function(k){return k.set(L*E,A*E).floor()},this.setDrawingBufferSize=function(k,K,tt){L=k,A=K,E=tt,e.width=Math.floor(k*tt),e.height=Math.floor(K*tt),this.setViewport(0,0,k,K)},this.getCurrentViewport=function(k){return k.copy(_)},this.getViewport=function(k){return k.copy($)},this.setViewport=function(k,K,tt,et){k.isVector4?$.set(k.x,k.y,k.z,k.w):$.set(k,K,tt,et),_t.viewport(_.copy($).multiplyScalar(E).round())},this.getScissor=function(k){return k.copy(Q)},this.setScissor=function(k,K,tt,et){k.isVector4?Q.set(k.x,k.y,k.z,k.w):Q.set(k,K,tt,et),_t.scissor(N.copy(Q).multiplyScalar(E).round())},this.getScissorTest=function(){return it},this.setScissorTest=function(k){_t.setScissorTest(it=k)},this.setOpaqueSort=function(k){I=k},this.setTransparentSort=function(k){V=k},this.getClearColor=function(k){return k.copy(Zt.getClearColor())},this.setClearColor=function(){Zt.setClearColor.apply(Zt,arguments)},this.getClearAlpha=function(){return Zt.getClearAlpha()},this.setClearAlpha=function(){Zt.setClearAlpha.apply(Zt,arguments)},this.clear=function(k=!0,K=!0,tt=!0){let et=0;if(k){let Y=!1;if(P!==null){const vt=P.texture.format;Y=vt===hc||vt===cc||vt===lc}if(Y){const vt=P.texture.type,Ct=vt===ui||vt===ns||vt===Ia||vt===Gs||vt===ac||vt===oc,Vt=Zt.getClearColor(),$t=Zt.getClearAlpha(),Qt=Vt.r,ne=Vt.g,Wt=Vt.b;Ct?(p[0]=Qt,p[1]=ne,p[2]=Wt,p[3]=$t,O.clearBufferuiv(O.COLOR,0,p)):(S[0]=Qt,S[1]=ne,S[2]=Wt,S[3]=$t,O.clearBufferiv(O.COLOR,0,S))}else et|=O.COLOR_BUFFER_BIT}K&&(et|=O.DEPTH_BUFFER_BIT),tt&&(et|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),O.clear(et)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",ct,!1),e.removeEventListener("webglcontextrestored",At,!1),e.removeEventListener("webglcontextcreationerror",Et,!1),Lt.dispose(),ce.dispose(),It.dispose(),R.dispose(),J.dispose(),rt.dispose(),we.dispose(),q.dispose(),Gt.dispose(),nt.dispose(),nt.removeEventListener("sessionstart",Rc),nt.removeEventListener("sessionend",Pc),Ni.stop()};function ct(k){k.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),C=!0}function At(){console.log("THREE.WebGLRenderer: Context Restored."),C=!1;const k=Yt.autoReset,K=Ut.enabled,tt=Ut.autoUpdate,et=Ut.needsUpdate,Y=Ut.type;bt(),Yt.autoReset=k,Ut.enabled=K,Ut.autoUpdate=tt,Ut.needsUpdate=et,Ut.type=Y}function Et(k){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",k.statusMessage)}function ee(k){const K=k.target;K.removeEventListener("dispose",ee),ke(K)}function ke(k){Ye(k),It.remove(k)}function Ye(k){const K=It.get(k).programs;K!==void 0&&(K.forEach(function(tt){Gt.releaseProgram(tt)}),k.isShaderMaterial&&Gt.releaseShaderCache(k))}this.renderBufferDirect=function(k,K,tt,et,Y,vt){K===null&&(K=Kt);const Ct=Y.isMesh&&Y.matrixWorld.determinant()<0,Vt=bf(k,K,tt,et,Y);_t.setMaterial(et,Ct);let $t=tt.index,Qt=1;if(et.wireframe===!0){if($t=ut.getWireframeAttribute(tt),$t===void 0)return;Qt=2}const ne=tt.drawRange,Wt=tt.attributes.position;let fe=ne.start*Qt,Te=(ne.start+ne.count)*Qt;vt!==null&&(fe=Math.max(fe,vt.start*Qt),Te=Math.min(Te,(vt.start+vt.count)*Qt)),$t!==null?(fe=Math.max(fe,0),Te=Math.min(Te,$t.count)):Wt!=null&&(fe=Math.max(fe,0),Te=Math.min(Te,Wt.count));const Ee=Te-fe;if(Ee<0||Ee===1/0)return;we.setup(Y,et,Vt,tt,$t);let on,ge=zt;if($t!==null&&(on=ot.get($t),ge=he,ge.setIndex(on)),Y.isMesh)et.wireframe===!0?(_t.setLineWidth(et.wireframeLinewidth*pt()),ge.setMode(O.LINES)):ge.setMode(O.TRIANGLES);else if(Y.isLine){let qt=et.linewidth;qt===void 0&&(qt=1),_t.setLineWidth(qt*pt()),Y.isLineSegments?ge.setMode(O.LINES):Y.isLineLoop?ge.setMode(O.LINE_LOOP):ge.setMode(O.LINE_STRIP)}else Y.isPoints?ge.setMode(O.POINTS):Y.isSprite&&ge.setMode(O.TRIANGLES);if(Y.isBatchedMesh)if(Y._multiDrawInstances!==null)ge.renderMultiDrawInstances(Y._multiDrawStarts,Y._multiDrawCounts,Y._multiDrawCount,Y._multiDrawInstances);else if(mt.get("WEBGL_multi_draw"))ge.renderMultiDraw(Y._multiDrawStarts,Y._multiDrawCounts,Y._multiDrawCount);else{const qt=Y._multiDrawStarts,jn=Y._multiDrawCounts,ve=Y._multiDrawCount,bn=$t?ot.get($t).bytesPerElement:1,hs=It.get(et).currentProgram.getUniforms();for(let cn=0;cn<ve;cn++)hs.setValue(O,"_gl_DrawID",cn),ge.render(qt[cn]/bn,jn[cn])}else if(Y.isInstancedMesh)ge.renderInstances(fe,Ee,Y.count);else if(tt.isInstancedBufferGeometry){const qt=tt._maxInstanceCount!==void 0?tt._maxInstanceCount:1/0,jn=Math.min(tt.instanceCount,qt);ge.renderInstances(fe,Ee,jn)}else ge.render(fe,Ee)};function Me(k,K,tt){k.transparent===!0&&k.side===Ae&&k.forceSinglePass===!1?(k.side=sn,k.needsUpdate=!0,Wa(k,K,tt),k.side=Di,k.needsUpdate=!0,Wa(k,K,tt),k.side=Ae):Wa(k,K,tt)}this.compile=function(k,K,tt=null){tt===null&&(tt=k),h=ce.get(tt),h.init(K),w.push(h),tt.traverseVisible(function(Y){Y.isLight&&Y.layers.test(K.layers)&&(h.pushLight(Y),Y.castShadow&&h.pushShadow(Y))}),k!==tt&&k.traverseVisible(function(Y){Y.isLight&&Y.layers.test(K.layers)&&(h.pushLight(Y),Y.castShadow&&h.pushShadow(Y))}),h.setupLights();const et=new Set;return k.traverse(function(Y){if(!(Y.isMesh||Y.isPoints||Y.isLine||Y.isSprite))return;const vt=Y.material;if(vt)if(Array.isArray(vt))for(let Ct=0;Ct<vt.length;Ct++){const Vt=vt[Ct];Me(Vt,tt,Y),et.add(Vt)}else Me(vt,tt,Y),et.add(vt)}),w.pop(),h=null,et},this.compileAsync=function(k,K,tt=null){const et=this.compile(k,K,tt);return new Promise(Y=>{function vt(){if(et.forEach(function(Ct){It.get(Ct).currentProgram.isReady()&&et.delete(Ct)}),et.size===0){Y(k);return}setTimeout(vt,10)}mt.get("KHR_parallel_shader_compile")!==null?vt():setTimeout(vt,10)})};let Sn=null;function Zn(k){Sn&&Sn(k)}function Rc(){Ni.stop()}function Pc(){Ni.start()}const Ni=new Ou;Ni.setAnimationLoop(Zn),typeof self<"u"&&Ni.setContext(self),this.setAnimationLoop=function(k){Sn=k,nt.setAnimationLoop(k),k===null?Ni.stop():Ni.start()},nt.addEventListener("sessionstart",Rc),nt.addEventListener("sessionend",Pc),this.render=function(k,K){if(K!==void 0&&K.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(C===!0)return;if(k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),K.parent===null&&K.matrixWorldAutoUpdate===!0&&K.updateMatrixWorld(),nt.enabled===!0&&nt.isPresenting===!0&&(nt.cameraAutoUpdate===!0&&nt.updateCamera(K),K=nt.getCamera()),k.isScene===!0&&k.onBeforeRender(y,k,K,P),h=ce.get(k,w.length),h.init(K),w.push(h),Rt.multiplyMatrices(K.projectionMatrix,K.matrixWorldInverse),W.setFromProjectionMatrix(Rt),ht=this.localClippingEnabled,j=gt.init(this.clippingPlanes,ht),g=Lt.get(k,b.length),g.init(),b.push(g),nt.enabled===!0&&nt.isPresenting===!0){const vt=y.xr.getDepthSensingMesh();vt!==null&&Jo(vt,K,-1/0,y.sortObjects)}Jo(k,K,0,y.sortObjects),g.finish(),y.sortObjects===!0&&g.sort(I,V),st=nt.enabled===!1||nt.isPresenting===!1||nt.hasDepthSensing()===!1,st&&Zt.addToRenderList(g,k),this.info.render.frame++,j===!0&&gt.beginShadows();const tt=h.state.shadowsArray;Ut.render(tt,k,K),j===!0&&gt.endShadows(),this.info.autoReset===!0&&this.info.reset();const et=g.opaque,Y=g.transmissive;if(h.setupLights(),K.isArrayCamera){const vt=K.cameras;if(Y.length>0)for(let Ct=0,Vt=vt.length;Ct<Vt;Ct++){const $t=vt[Ct];Ic(et,Y,k,$t)}st&&Zt.render(k);for(let Ct=0,Vt=vt.length;Ct<Vt;Ct++){const $t=vt[Ct];kc(g,k,$t,$t.viewport)}}else Y.length>0&&Ic(et,Y,k,K),st&&Zt.render(k),kc(g,k,K);P!==null&&(D.updateMultisampleRenderTarget(P),D.updateRenderTargetMipmap(P)),k.isScene===!0&&k.onAfterRender(y,k,K),we.resetDefaultState(),x=-1,M=null,w.pop(),w.length>0?(h=w[w.length-1],j===!0&&gt.setGlobalState(y.clippingPlanes,h.state.camera)):h=null,b.pop(),b.length>0?g=b[b.length-1]:g=null};function Jo(k,K,tt,et){if(k.visible===!1)return;if(k.layers.test(K.layers)){if(k.isGroup)tt=k.renderOrder;else if(k.isLOD)k.autoUpdate===!0&&k.update(K);else if(k.isLight)h.pushLight(k),k.castShadow&&h.pushShadow(k);else if(k.isSprite){if(!k.frustumCulled||W.intersectsSprite(k)){et&&kt.setFromMatrixPosition(k.matrixWorld).applyMatrix4(Rt);const Ct=rt.update(k),Vt=k.material;Vt.visible&&g.push(k,Ct,Vt,tt,kt.z,null)}}else if((k.isMesh||k.isLine||k.isPoints)&&(!k.frustumCulled||W.intersectsObject(k))){const Ct=rt.update(k),Vt=k.material;if(et&&(k.boundingSphere!==void 0?(k.boundingSphere===null&&k.computeBoundingSphere(),kt.copy(k.boundingSphere.center)):(Ct.boundingSphere===null&&Ct.computeBoundingSphere(),kt.copy(Ct.boundingSphere.center)),kt.applyMatrix4(k.matrixWorld).applyMatrix4(Rt)),Array.isArray(Vt)){const $t=Ct.groups;for(let Qt=0,ne=$t.length;Qt<ne;Qt++){const Wt=$t[Qt],fe=Vt[Wt.materialIndex];fe&&fe.visible&&g.push(k,Ct,fe,tt,kt.z,Wt)}}else Vt.visible&&g.push(k,Ct,Vt,tt,kt.z,null)}}const vt=k.children;for(let Ct=0,Vt=vt.length;Ct<Vt;Ct++)Jo(vt[Ct],K,tt,et)}function kc(k,K,tt,et){const Y=k.opaque,vt=k.transmissive,Ct=k.transparent;h.setupLightsView(tt),j===!0&&gt.setGlobalState(y.clippingPlanes,tt),et&&_t.viewport(_.copy(et)),Y.length>0&&$a(Y,K,tt),vt.length>0&&$a(vt,K,tt),Ct.length>0&&$a(Ct,K,tt),_t.buffers.depth.setTest(!0),_t.buffers.depth.setMask(!0),_t.buffers.color.setMask(!0),_t.setPolygonOffset(!1)}function Ic(k,K,tt,et){if((tt.isScene===!0?tt.overrideMaterial:null)!==null)return;h.state.transmissionRenderTarget[et.id]===void 0&&(h.state.transmissionRenderTarget[et.id]=new kn(1,1,{generateMipmaps:!0,type:mt.has("EXT_color_buffer_half_float")||mt.has("EXT_color_buffer_float")?ci:ui,minFilter:Yi,samples:4,stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:de.workingColorSpace}));const vt=h.state.transmissionRenderTarget[et.id],Ct=et.viewport||_;vt.setSize(Ct.z,Ct.w);const Vt=y.getRenderTarget();y.setRenderTarget(vt),y.getClearColor(H),z=y.getClearAlpha(),z<1&&y.setClearColor(16777215,.5),y.clear(),st&&Zt.render(tt);const $t=y.toneMapping;y.toneMapping=Ai;const Qt=et.viewport;if(et.viewport!==void 0&&(et.viewport=void 0),h.setupLightsView(et),j===!0&&gt.setGlobalState(y.clippingPlanes,et),$a(k,tt,et),D.updateMultisampleRenderTarget(vt),D.updateRenderTargetMipmap(vt),mt.has("WEBGL_multisampled_render_to_texture")===!1){let ne=!1;for(let Wt=0,fe=K.length;Wt<fe;Wt++){const Te=K[Wt],Ee=Te.object,on=Te.geometry,ge=Te.material,qt=Te.group;if(ge.side===Ae&&Ee.layers.test(et.layers)){const jn=ge.side;ge.side=sn,ge.needsUpdate=!0,Lc(Ee,tt,et,on,ge,qt),ge.side=jn,ge.needsUpdate=!0,ne=!0}}ne===!0&&(D.updateMultisampleRenderTarget(vt),D.updateRenderTargetMipmap(vt))}y.setRenderTarget(Vt),y.setClearColor(H,z),Qt!==void 0&&(et.viewport=Qt),y.toneMapping=$t}function $a(k,K,tt){const et=K.isScene===!0?K.overrideMaterial:null;for(let Y=0,vt=k.length;Y<vt;Y++){const Ct=k[Y],Vt=Ct.object,$t=Ct.geometry,Qt=et===null?Ct.material:et,ne=Ct.group;Vt.layers.test(tt.layers)&&Lc(Vt,K,tt,$t,Qt,ne)}}function Lc(k,K,tt,et,Y,vt){k.onBeforeRender(y,K,tt,et,Y,vt),k.modelViewMatrix.multiplyMatrices(tt.matrixWorldInverse,k.matrixWorld),k.normalMatrix.getNormalMatrix(k.modelViewMatrix),Y.onBeforeRender(y,K,tt,et,k,vt),Y.transparent===!0&&Y.side===Ae&&Y.forceSinglePass===!1?(Y.side=sn,Y.needsUpdate=!0,y.renderBufferDirect(tt,K,et,Y,k,vt),Y.side=Di,Y.needsUpdate=!0,y.renderBufferDirect(tt,K,et,Y,k,vt),Y.side=Ae):y.renderBufferDirect(tt,K,et,Y,k,vt),k.onAfterRender(y,K,tt,et,Y,vt)}function Wa(k,K,tt){K.isScene!==!0&&(K=Kt);const et=It.get(k),Y=h.state.lights,vt=h.state.shadowsArray,Ct=Y.state.version,Vt=Gt.getParameters(k,Y.state,vt,K,tt),$t=Gt.getProgramCacheKey(Vt);let Qt=et.programs;et.environment=k.isMeshStandardMaterial?K.environment:null,et.fog=K.fog,et.envMap=(k.isMeshStandardMaterial?J:R).get(k.envMap||et.environment),et.envMapRotation=et.environment!==null&&k.envMap===null?K.environmentRotation:k.envMapRotation,Qt===void 0&&(k.addEventListener("dispose",ee),Qt=new Map,et.programs=Qt);let ne=Qt.get($t);if(ne!==void 0){if(et.currentProgram===ne&&et.lightsStateVersion===Ct)return Bc(k,Vt),ne}else Vt.uniforms=Gt.getUniforms(k),k.onBeforeCompile(Vt,y),ne=Gt.acquireProgram(Vt,$t),Qt.set($t,ne),et.uniforms=Vt.uniforms;const Wt=et.uniforms;return(!k.isShaderMaterial&&!k.isRawShaderMaterial||k.clipping===!0)&&(Wt.clippingPlanes=gt.uniform),Bc(k,Vt),et.needsLights=Tf(k),et.lightsStateVersion=Ct,et.needsLights&&(Wt.ambientLightColor.value=Y.state.ambient,Wt.lightProbe.value=Y.state.probe,Wt.directionalLights.value=Y.state.directional,Wt.directionalLightShadows.value=Y.state.directionalShadow,Wt.spotLights.value=Y.state.spot,Wt.spotLightShadows.value=Y.state.spotShadow,Wt.rectAreaLights.value=Y.state.rectArea,Wt.ltc_1.value=Y.state.rectAreaLTC1,Wt.ltc_2.value=Y.state.rectAreaLTC2,Wt.pointLights.value=Y.state.point,Wt.pointLightShadows.value=Y.state.pointShadow,Wt.hemisphereLights.value=Y.state.hemi,Wt.directionalShadowMap.value=Y.state.directionalShadowMap,Wt.directionalShadowMatrix.value=Y.state.directionalShadowMatrix,Wt.spotShadowMap.value=Y.state.spotShadowMap,Wt.spotLightMatrix.value=Y.state.spotLightMatrix,Wt.spotLightMap.value=Y.state.spotLightMap,Wt.pointShadowMap.value=Y.state.pointShadowMap,Wt.pointShadowMatrix.value=Y.state.pointShadowMatrix),et.currentProgram=ne,et.uniformsList=null,ne}function Dc(k){if(k.uniformsList===null){const K=k.currentProgram.getUniforms();k.uniformsList=Po.seqWithValue(K.seq,k.uniforms)}return k.uniformsList}function Bc(k,K){const tt=It.get(k);tt.outputColorSpace=K.outputColorSpace,tt.batching=K.batching,tt.batchingColor=K.batchingColor,tt.instancing=K.instancing,tt.instancingColor=K.instancingColor,tt.instancingMorph=K.instancingMorph,tt.skinning=K.skinning,tt.morphTargets=K.morphTargets,tt.morphNormals=K.morphNormals,tt.morphColors=K.morphColors,tt.morphTargetsCount=K.morphTargetsCount,tt.numClippingPlanes=K.numClippingPlanes,tt.numIntersection=K.numClipIntersection,tt.vertexAlphas=K.vertexAlphas,tt.vertexTangents=K.vertexTangents,tt.toneMapping=K.toneMapping}function bf(k,K,tt,et,Y){K.isScene!==!0&&(K=Kt),D.resetTextureUnits();const vt=K.fog,Ct=et.isMeshStandardMaterial?K.environment:null,Vt=P===null?y.outputColorSpace:P.isXRRenderTarget===!0?P.texture.colorSpace:Zs,$t=(et.isMeshStandardMaterial?J:R).get(et.envMap||Ct),Qt=et.vertexColors===!0&&!!tt.attributes.color&&tt.attributes.color.itemSize===4,ne=!!tt.attributes.tangent&&(!!et.normalMap||et.anisotropy>0),Wt=!!tt.morphAttributes.position,fe=!!tt.morphAttributes.normal,Te=!!tt.morphAttributes.color;let Ee=Ai;et.toneMapped&&(P===null||P.isXRRenderTarget===!0)&&(Ee=y.toneMapping);const on=tt.morphAttributes.position||tt.morphAttributes.normal||tt.morphAttributes.color,ge=on!==void 0?on.length:0,qt=It.get(et),jn=h.state.lights;if(j===!0&&(ht===!0||k!==M)){const gn=k===M&&et.id===x;gt.setState(et,k,gn)}let ve=!1;et.version===qt.__version?(qt.needsLights&&qt.lightsStateVersion!==jn.state.version||qt.outputColorSpace!==Vt||Y.isBatchedMesh&&qt.batching===!1||!Y.isBatchedMesh&&qt.batching===!0||Y.isBatchedMesh&&qt.batchingColor===!0&&Y.colorTexture===null||Y.isBatchedMesh&&qt.batchingColor===!1&&Y.colorTexture!==null||Y.isInstancedMesh&&qt.instancing===!1||!Y.isInstancedMesh&&qt.instancing===!0||Y.isSkinnedMesh&&qt.skinning===!1||!Y.isSkinnedMesh&&qt.skinning===!0||Y.isInstancedMesh&&qt.instancingColor===!0&&Y.instanceColor===null||Y.isInstancedMesh&&qt.instancingColor===!1&&Y.instanceColor!==null||Y.isInstancedMesh&&qt.instancingMorph===!0&&Y.morphTexture===null||Y.isInstancedMesh&&qt.instancingMorph===!1&&Y.morphTexture!==null||qt.envMap!==$t||et.fog===!0&&qt.fog!==vt||qt.numClippingPlanes!==void 0&&(qt.numClippingPlanes!==gt.numPlanes||qt.numIntersection!==gt.numIntersection)||qt.vertexAlphas!==Qt||qt.vertexTangents!==ne||qt.morphTargets!==Wt||qt.morphNormals!==fe||qt.morphColors!==Te||qt.toneMapping!==Ee||qt.morphTargetsCount!==ge)&&(ve=!0):(ve=!0,qt.__version=et.version);let bn=qt.currentProgram;ve===!0&&(bn=Wa(et,K,Y));let hs=!1,cn=!1,ia=!1;const Ce=bn.getUniforms(),Dn=qt.uniforms;if(_t.useProgram(bn.program)&&(hs=!0,cn=!0,ia=!0),et.id!==x&&(x=et.id,cn=!0),hs||M!==k){_t.buffers.depth.getReversed()?(dt.copy(k.projectionMatrix),Cp(dt),Ap(dt),Ce.setValue(O,"projectionMatrix",dt)):Ce.setValue(O,"projectionMatrix",k.projectionMatrix),Ce.setValue(O,"viewMatrix",k.matrixWorldInverse);const pi=Ce.map.cameraPosition;pi!==void 0&&pi.setValue(O,Pt.setFromMatrixPosition(k.matrixWorld)),Dt.logarithmicDepthBuffer&&Ce.setValue(O,"logDepthBufFC",2/(Math.log(k.far+1)/Math.LN2)),(et.isMeshPhongMaterial||et.isMeshToonMaterial||et.isMeshLambertMaterial||et.isMeshBasicMaterial||et.isMeshStandardMaterial||et.isShaderMaterial)&&Ce.setValue(O,"isOrthographic",k.isOrthographicCamera===!0),M!==k&&(M=k,cn=!0,ia=!0)}if(Y.isSkinnedMesh){Ce.setOptional(O,Y,"bindMatrix"),Ce.setOptional(O,Y,"bindMatrixInverse");const gn=Y.skeleton;gn&&(gn.boneTexture===null&&gn.computeBoneTexture(),Ce.setValue(O,"boneTexture",gn.boneTexture,D))}Y.isBatchedMesh&&(Ce.setOptional(O,Y,"batchingTexture"),Ce.setValue(O,"batchingTexture",Y._matricesTexture,D),Ce.setOptional(O,Y,"batchingIdTexture"),Ce.setValue(O,"batchingIdTexture",Y._indirectTexture,D),Ce.setOptional(O,Y,"batchingColorTexture"),Y._colorsTexture!==null&&Ce.setValue(O,"batchingColorTexture",Y._colorsTexture,D));const sa=tt.morphAttributes;if((sa.position!==void 0||sa.normal!==void 0||sa.color!==void 0)&&Jt.update(Y,tt,bn),(cn||qt.receiveShadow!==Y.receiveShadow)&&(qt.receiveShadow=Y.receiveShadow,Ce.setValue(O,"receiveShadow",Y.receiveShadow)),et.isMeshGouraudMaterial&&et.envMap!==null&&(Dn.envMap.value=$t,Dn.flipEnvMap.value=$t.isCubeTexture&&$t.isRenderTargetTexture===!1?-1:1),et.isMeshStandardMaterial&&et.envMap===null&&K.environment!==null&&(Dn.envMapIntensity.value=K.environmentIntensity),cn&&(Ce.setValue(O,"toneMappingExposure",y.toneMappingExposure),qt.needsLights&&wf(Dn,ia),vt&&et.fog===!0&&St.refreshFogUniforms(Dn,vt),St.refreshMaterialUniforms(Dn,et,E,A,h.state.transmissionRenderTarget[k.id]),Po.upload(O,Dc(qt),Dn,D)),et.isShaderMaterial&&et.uniformsNeedUpdate===!0&&(Po.upload(O,Dc(qt),Dn,D),et.uniformsNeedUpdate=!1),et.isSpriteMaterial&&Ce.setValue(O,"center",Y.center),Ce.setValue(O,"modelViewMatrix",Y.modelViewMatrix),Ce.setValue(O,"normalMatrix",Y.normalMatrix),Ce.setValue(O,"modelMatrix",Y.matrixWorld),et.isShaderMaterial||et.isRawShaderMaterial){const gn=et.uniformsGroups;for(let pi=0,mi=gn.length;pi<mi;pi++){const Nc=gn[pi];q.update(Nc,bn),q.bind(Nc,bn)}}return bn}function wf(k,K){k.ambientLightColor.needsUpdate=K,k.lightProbe.needsUpdate=K,k.directionalLights.needsUpdate=K,k.directionalLightShadows.needsUpdate=K,k.pointLights.needsUpdate=K,k.pointLightShadows.needsUpdate=K,k.spotLights.needsUpdate=K,k.spotLightShadows.needsUpdate=K,k.rectAreaLights.needsUpdate=K,k.hemisphereLights.needsUpdate=K}function Tf(k){return k.isMeshLambertMaterial||k.isMeshToonMaterial||k.isMeshPhongMaterial||k.isMeshStandardMaterial||k.isShadowMaterial||k.isShaderMaterial&&k.lights===!0}this.getActiveCubeFace=function(){return v},this.getActiveMipmapLevel=function(){return T},this.getRenderTarget=function(){return P},this.setRenderTargetTextures=function(k,K,tt){It.get(k.texture).__webglTexture=K,It.get(k.depthTexture).__webglTexture=tt;const et=It.get(k);et.__hasExternalTextures=!0,et.__autoAllocateDepthBuffer=tt===void 0,et.__autoAllocateDepthBuffer||mt.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),et.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(k,K){const tt=It.get(k);tt.__webglFramebuffer=K,tt.__useDefaultFramebuffer=K===void 0},this.setRenderTarget=function(k,K=0,tt=0){P=k,v=K,T=tt;let et=!0,Y=null,vt=!1,Ct=!1;if(k){const $t=It.get(k);if($t.__useDefaultFramebuffer!==void 0)_t.bindFramebuffer(O.FRAMEBUFFER,null),et=!1;else if($t.__webglFramebuffer===void 0)D.setupRenderTarget(k);else if($t.__hasExternalTextures)D.rebindTextures(k,It.get(k.texture).__webglTexture,It.get(k.depthTexture).__webglTexture);else if(k.depthBuffer){const Wt=k.depthTexture;if($t.__boundDepthTexture!==Wt){if(Wt!==null&&It.has(Wt)&&(k.width!==Wt.image.width||k.height!==Wt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");D.setupDepthRenderbuffer(k)}}const Qt=k.texture;(Qt.isData3DTexture||Qt.isDataArrayTexture||Qt.isCompressedArrayTexture)&&(Ct=!0);const ne=It.get(k).__webglFramebuffer;k.isWebGLCubeRenderTarget?(Array.isArray(ne[K])?Y=ne[K][tt]:Y=ne[K],vt=!0):k.samples>0&&D.useMultisampledRTT(k)===!1?Y=It.get(k).__webglMultisampledFramebuffer:Array.isArray(ne)?Y=ne[tt]:Y=ne,_.copy(k.viewport),N.copy(k.scissor),U=k.scissorTest}else _.copy($).multiplyScalar(E).floor(),N.copy(Q).multiplyScalar(E).floor(),U=it;if(_t.bindFramebuffer(O.FRAMEBUFFER,Y)&&et&&_t.drawBuffers(k,Y),_t.viewport(_),_t.scissor(N),_t.setScissorTest(U),vt){const $t=It.get(k.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+K,$t.__webglTexture,tt)}else if(Ct){const $t=It.get(k.texture),Qt=K||0;O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,$t.__webglTexture,tt||0,Qt)}x=-1},this.readRenderTargetPixels=function(k,K,tt,et,Y,vt,Ct){if(!(k&&k.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Vt=It.get(k).__webglFramebuffer;if(k.isWebGLCubeRenderTarget&&Ct!==void 0&&(Vt=Vt[Ct]),Vt){_t.bindFramebuffer(O.FRAMEBUFFER,Vt);try{const $t=k.texture,Qt=$t.format,ne=$t.type;if(!Dt.textureFormatReadable(Qt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Dt.textureTypeReadable(ne)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}K>=0&&K<=k.width-et&&tt>=0&&tt<=k.height-Y&&O.readPixels(K,tt,et,Y,ae.convert(Qt),ae.convert(ne),vt)}finally{const $t=P!==null?It.get(P).__webglFramebuffer:null;_t.bindFramebuffer(O.FRAMEBUFFER,$t)}}},this.readRenderTargetPixelsAsync=async function(k,K,tt,et,Y,vt,Ct){if(!(k&&k.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Vt=It.get(k).__webglFramebuffer;if(k.isWebGLCubeRenderTarget&&Ct!==void 0&&(Vt=Vt[Ct]),Vt){const $t=k.texture,Qt=$t.format,ne=$t.type;if(!Dt.textureFormatReadable(Qt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Dt.textureTypeReadable(ne))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(K>=0&&K<=k.width-et&&tt>=0&&tt<=k.height-Y){_t.bindFramebuffer(O.FRAMEBUFFER,Vt);const Wt=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,Wt),O.bufferData(O.PIXEL_PACK_BUFFER,vt.byteLength,O.STREAM_READ),O.readPixels(K,tt,et,Y,ae.convert(Qt),ae.convert(ne),0);const fe=P!==null?It.get(P).__webglFramebuffer:null;_t.bindFramebuffer(O.FRAMEBUFFER,fe);const Te=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await Ep(O,Te,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,Wt),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,vt),O.deleteBuffer(Wt),O.deleteSync(Te),vt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(k,K=null,tt=0){k.isTexture!==!0&&(ga("WebGLRenderer: copyFramebufferToTexture function signature has changed."),K=arguments[0]||null,k=arguments[1]);const et=Math.pow(2,-tt),Y=Math.floor(k.image.width*et),vt=Math.floor(k.image.height*et),Ct=K!==null?K.x:0,Vt=K!==null?K.y:0;D.setTexture2D(k,0),O.copyTexSubImage2D(O.TEXTURE_2D,tt,0,0,Ct,Vt,Y,vt),_t.unbindTexture()},this.copyTextureToTexture=function(k,K,tt=null,et=null,Y=0){k.isTexture!==!0&&(ga("WebGLRenderer: copyTextureToTexture function signature has changed."),et=arguments[0]||null,k=arguments[1],K=arguments[2],Y=arguments[3]||0,tt=null);let vt,Ct,Vt,$t,Qt,ne,Wt,fe,Te;const Ee=k.isCompressedTexture?k.mipmaps[Y]:k.image;tt!==null?(vt=tt.max.x-tt.min.x,Ct=tt.max.y-tt.min.y,Vt=tt.isBox3?tt.max.z-tt.min.z:1,$t=tt.min.x,Qt=tt.min.y,ne=tt.isBox3?tt.min.z:0):(vt=Ee.width,Ct=Ee.height,Vt=Ee.depth||1,$t=0,Qt=0,ne=0),et!==null?(Wt=et.x,fe=et.y,Te=et.z):(Wt=0,fe=0,Te=0);const on=ae.convert(K.format),ge=ae.convert(K.type);let qt;K.isData3DTexture?(D.setTexture3D(K,0),qt=O.TEXTURE_3D):K.isDataArrayTexture||K.isCompressedArrayTexture?(D.setTexture2DArray(K,0),qt=O.TEXTURE_2D_ARRAY):(D.setTexture2D(K,0),qt=O.TEXTURE_2D),O.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,K.flipY),O.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,K.premultiplyAlpha),O.pixelStorei(O.UNPACK_ALIGNMENT,K.unpackAlignment);const jn=O.getParameter(O.UNPACK_ROW_LENGTH),ve=O.getParameter(O.UNPACK_IMAGE_HEIGHT),bn=O.getParameter(O.UNPACK_SKIP_PIXELS),hs=O.getParameter(O.UNPACK_SKIP_ROWS),cn=O.getParameter(O.UNPACK_SKIP_IMAGES);O.pixelStorei(O.UNPACK_ROW_LENGTH,Ee.width),O.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Ee.height),O.pixelStorei(O.UNPACK_SKIP_PIXELS,$t),O.pixelStorei(O.UNPACK_SKIP_ROWS,Qt),O.pixelStorei(O.UNPACK_SKIP_IMAGES,ne);const ia=k.isDataArrayTexture||k.isData3DTexture,Ce=K.isDataArrayTexture||K.isData3DTexture;if(k.isRenderTargetTexture||k.isDepthTexture){const Dn=It.get(k),sa=It.get(K),gn=It.get(Dn.__renderTarget),pi=It.get(sa.__renderTarget);_t.bindFramebuffer(O.READ_FRAMEBUFFER,gn.__webglFramebuffer),_t.bindFramebuffer(O.DRAW_FRAMEBUFFER,pi.__webglFramebuffer);for(let mi=0;mi<Vt;mi++)ia&&O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,It.get(k).__webglTexture,Y,ne+mi),k.isDepthTexture?(Ce&&O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,It.get(K).__webglTexture,Y,Te+mi),O.blitFramebuffer($t,Qt,vt,Ct,Wt,fe,vt,Ct,O.DEPTH_BUFFER_BIT,O.NEAREST)):Ce?O.copyTexSubImage3D(qt,Y,Wt,fe,Te+mi,$t,Qt,vt,Ct):O.copyTexSubImage2D(qt,Y,Wt,fe,Te+mi,$t,Qt,vt,Ct);_t.bindFramebuffer(O.READ_FRAMEBUFFER,null),_t.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else Ce?k.isDataTexture||k.isData3DTexture?O.texSubImage3D(qt,Y,Wt,fe,Te,vt,Ct,Vt,on,ge,Ee.data):K.isCompressedArrayTexture?O.compressedTexSubImage3D(qt,Y,Wt,fe,Te,vt,Ct,Vt,on,Ee.data):O.texSubImage3D(qt,Y,Wt,fe,Te,vt,Ct,Vt,on,ge,Ee):k.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,Y,Wt,fe,vt,Ct,on,ge,Ee.data):k.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,Y,Wt,fe,Ee.width,Ee.height,on,Ee.data):O.texSubImage2D(O.TEXTURE_2D,Y,Wt,fe,vt,Ct,on,ge,Ee);O.pixelStorei(O.UNPACK_ROW_LENGTH,jn),O.pixelStorei(O.UNPACK_IMAGE_HEIGHT,ve),O.pixelStorei(O.UNPACK_SKIP_PIXELS,bn),O.pixelStorei(O.UNPACK_SKIP_ROWS,hs),O.pixelStorei(O.UNPACK_SKIP_IMAGES,cn),Y===0&&K.generateMipmaps&&O.generateMipmap(qt),_t.unbindTexture()},this.copyTextureToTexture3D=function(k,K,tt=null,et=null,Y=0){return k.isTexture!==!0&&(ga("WebGLRenderer: copyTextureToTexture3D function signature has changed."),tt=arguments[0]||null,et=arguments[1]||null,k=arguments[2],K=arguments[3],Y=arguments[4]||0),ga('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(k,K,tt,et,Y)},this.initRenderTarget=function(k){It.get(k).__webglFramebuffer===void 0&&D.setupRenderTarget(k)},this.initTexture=function(k){k.isCubeTexture?D.setTextureCube(k,0):k.isData3DTexture?D.setTexture3D(k,0):k.isDataArrayTexture||k.isCompressedArrayTexture?D.setTexture2DArray(k,0):D.setTexture2D(k,0),_t.unbindTexture()},this.resetState=function(){v=0,T=0,P=null,_t.reset(),we.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ai}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=de._getDrawingBufferColorSpace(t),e.unpackColorSpace=de._getUnpackColorSpace()}}class Sa{constructor(t,e=25e-5){this.isFogExp2=!0,this.name="",this.color=new Tt(t),this.density=e}clone(){return new Sa(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class Xu extends Oe{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Kn,this.environmentIntensity=1,this.environmentRotation=new Kn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class Uv extends Je{constructor(t=null,e=1,n=1,s,a,o,r,l,c=mn,d=mn,u,f){super(null,o,r,l,c,d,s,a,u,f),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ti extends Le{constructor(t,e,n,s=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const Ts=new _e,Dh=new _e,po=[],Bh=new ls,zv=new _e,ca=new F,ha=new Js;class Si extends F{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new Ti(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,zv)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new ls),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ts),Bh.copy(t.boundingBox).applyMatrix4(Ts),this.boundingBox.union(Bh)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Js),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ts),ha.copy(t.boundingSphere).applyMatrix4(Ts),this.boundingSphere.union(ha)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const n=e.morphTargetInfluences,s=this.morphTexture.source.data.data,a=n.length+1,o=t*a+1;for(let r=0;r<n.length;r++)n[r]=s[o+r]}raycast(t,e){const n=this.matrixWorld,s=this.count;if(ca.geometry=this.geometry,ca.material=this.material,ca.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ha.copy(this.boundingSphere),ha.applyMatrix4(n),t.ray.intersectsSphere(ha)!==!1))for(let a=0;a<s;a++){this.getMatrixAt(a,Ts),Dh.multiplyMatrices(n,Ts),ca.matrixWorld=Dh,ca.raycast(t,po);for(let o=0,r=po.length;o<r;o++){const l=po[o];l.instanceId=a,l.object=this,e.push(l)}po.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new Ti(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}setMorphAt(t,e){const n=e.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new Uv(new Float32Array(s*this.count),s,this.count,rc,Gn));const a=this.morphTexture.source.data.data;let o=0;for(let c=0;c<n.length;c++)o+=n[c];const r=this.geometry.morphTargetsRelative?1:1-o,l=s*t;a[l]=r,a.set(n,l+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}}class qu extends Qs{static get type(){return"PointsMaterial"}constructor(t){super(),this.isPointsMaterial=!0,this.color=new Tt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}const Nh=new _e,Ol=new uc,mo=new Js,go=new G;class Fv extends Oe{constructor(t=new Ue,e=new qu){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,e){const n=this.geometry,s=this.matrixWorld,a=t.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),mo.copy(n.boundingSphere),mo.applyMatrix4(s),mo.radius+=a,t.ray.intersectsSphere(mo)===!1)return;Nh.copy(s).invert(),Ol.copy(t.ray).applyMatrix4(Nh);const r=a/((this.scale.x+this.scale.y+this.scale.z)/3),l=r*r,c=n.index,u=n.attributes.position;if(c!==null){const f=Math.max(0,o.start),m=Math.min(c.count,o.start+o.count);for(let p=f,S=m;p<S;p++){const g=c.getX(p);go.fromBufferAttribute(u,g),Uh(go,g,l,s,t,e,this)}}else{const f=Math.max(0,o.start),m=Math.min(u.count,o.start+o.count);for(let p=f,S=m;p<S;p++)go.fromBufferAttribute(u,p),Uh(go,p,l,s,t,e,this)}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,o=s.length;a<o;a++){const r=s[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[r]=a}}}}}function Uh(i,t,e,n,s,a,o){const r=Ol.distanceSqToPoint(i);if(r<e){const l=new G;Ol.closestPointToPoint(i,l),l.applyMatrix4(n);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;a.push({distance:c,distanceToRay:Math.sqrt(r),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}class In extends Je{constructor(t,e,n,s,a,o,r,l,c){super(t,e,n,s,a,o,r,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Yn{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,s=this.getPoint(0),a=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),a+=n.distanceTo(s),e.push(a),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e){const n=this.getLengths();let s=0;const a=n.length;let o;e?o=e:o=t*n[a-1];let r=0,l=a-1,c;for(;r<=l;)if(s=Math.floor(r+(l-r)/2),c=n[s]-o,c<0)r=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===o)return s/(a-1);const d=n[s],f=n[s+1]-d,m=(o-d)/f;return(s+m)/(a-1)}getTangent(t,e){let s=t-1e-4,a=t+1e-4;s<0&&(s=0),a>1&&(a=1);const o=this.getPoint(s),r=this.getPoint(a),l=e||(o.isVector2?new ft:new G);return l.copy(r).sub(o).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e){const n=new G,s=[],a=[],o=[],r=new G,l=new _e;for(let m=0;m<=t;m++){const p=m/t;s[m]=this.getTangentAt(p,new G)}a[0]=new G,o[0]=new G;let c=Number.MAX_VALUE;const d=Math.abs(s[0].x),u=Math.abs(s[0].y),f=Math.abs(s[0].z);d<=c&&(c=d,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),f<=c&&n.set(0,0,1),r.crossVectors(s[0],n).normalize(),a[0].crossVectors(s[0],r),o[0].crossVectors(s[0],a[0]);for(let m=1;m<=t;m++){if(a[m]=a[m-1].clone(),o[m]=o[m-1].clone(),r.crossVectors(s[m-1],s[m]),r.length()>Number.EPSILON){r.normalize();const p=Math.acos($e(s[m-1].dot(s[m]),-1,1));a[m].applyMatrix4(l.makeRotationAxis(r,p))}o[m].crossVectors(s[m],a[m])}if(e===!0){let m=Math.acos($e(a[0].dot(a[t]),-1,1));m/=t,s[0].dot(r.crossVectors(a[0],a[t]))>0&&(m=-m);for(let p=1;p<=t;p++)a[p].applyMatrix4(l.makeRotationAxis(s[p],m*p)),o[p].crossVectors(s[p],a[p])}return{tangents:s,normals:a,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class vc extends Yn{constructor(t=0,e=0,n=1,s=1,a=0,o=Math.PI*2,r=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=a,this.aEndAngle=o,this.aClockwise=r,this.aRotation=l}getPoint(t,e=new ft){const n=e,s=Math.PI*2;let a=this.aEndAngle-this.aStartAngle;const o=Math.abs(a)<Number.EPSILON;for(;a<0;)a+=s;for(;a>s;)a-=s;a<Number.EPSILON&&(o?a=0:a=s),this.aClockwise===!0&&!o&&(a===s?a=-s:a=a-s);const r=this.aStartAngle+t*a;let l=this.aX+this.xRadius*Math.cos(r),c=this.aY+this.yRadius*Math.sin(r);if(this.aRotation!==0){const d=Math.cos(this.aRotation),u=Math.sin(this.aRotation),f=l-this.aX,m=c-this.aY;l=f*d-m*u+this.aX,c=f*u+m*d+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class Ov extends vc{constructor(t,e,n,s,a,o){super(t,e,n,n,s,a,o),this.isArcCurve=!0,this.type="ArcCurve"}}function xc(){let i=0,t=0,e=0,n=0;function s(a,o,r,l){i=a,t=r,e=-3*a+3*o-2*r-l,n=2*a-2*o+r+l}return{initCatmullRom:function(a,o,r,l,c){s(o,r,c*(r-a),c*(l-o))},initNonuniformCatmullRom:function(a,o,r,l,c,d,u){let f=(o-a)/c-(r-a)/(c+d)+(r-o)/d,m=(r-o)/d-(l-o)/(d+u)+(l-r)/u;f*=d,m*=d,s(o,r,f,m)},calc:function(a){const o=a*a,r=o*a;return i+t*a+e*o+n*r}}}const vo=new G,Cr=new xc,Ar=new xc,Rr=new xc;class Ku extends Yn{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new G){const n=e,s=this.points,a=s.length,o=(a-(this.closed?0:1))*t;let r=Math.floor(o),l=o-r;this.closed?r+=r>0?0:(Math.floor(Math.abs(r)/a)+1)*a:l===0&&r===a-1&&(r=a-2,l=1);let c,d;this.closed||r>0?c=s[(r-1)%a]:(vo.subVectors(s[0],s[1]).add(s[0]),c=vo);const u=s[r%a],f=s[(r+1)%a];if(this.closed||r+2<a?d=s[(r+2)%a]:(vo.subVectors(s[a-1],s[a-2]).add(s[a-1]),d=vo),this.curveType==="centripetal"||this.curveType==="chordal"){const m=this.curveType==="chordal"?.5:.25;let p=Math.pow(c.distanceToSquared(u),m),S=Math.pow(u.distanceToSquared(f),m),g=Math.pow(f.distanceToSquared(d),m);S<1e-4&&(S=1),p<1e-4&&(p=S),g<1e-4&&(g=S),Cr.initNonuniformCatmullRom(c.x,u.x,f.x,d.x,p,S,g),Ar.initNonuniformCatmullRom(c.y,u.y,f.y,d.y,p,S,g),Rr.initNonuniformCatmullRom(c.z,u.z,f.z,d.z,p,S,g)}else this.curveType==="catmullrom"&&(Cr.initCatmullRom(c.x,u.x,f.x,d.x,this.tension),Ar.initCatmullRom(c.y,u.y,f.y,d.y,this.tension),Rr.initCatmullRom(c.z,u.z,f.z,d.z,this.tension));return n.set(Cr.calc(l),Ar.calc(l),Rr.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new G().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function zh(i,t,e,n,s){const a=(n-t)*.5,o=(s-e)*.5,r=i*i,l=i*r;return(2*e-2*n+a+o)*l+(-3*e+3*n-2*a-o)*r+a*i+e}function Hv(i,t){const e=1-i;return e*e*t}function Gv(i,t){return 2*(1-i)*i*t}function Vv(i,t){return i*i*t}function ba(i,t,e,n){return Hv(i,t)+Gv(i,e)+Vv(i,n)}function $v(i,t){const e=1-i;return e*e*e*t}function Wv(i,t){const e=1-i;return 3*e*e*i*t}function Xv(i,t){return 3*(1-i)*i*i*t}function qv(i,t){return i*i*i*t}function wa(i,t,e,n,s){return $v(i,t)+Wv(i,e)+Xv(i,n)+qv(i,s)}class Yu extends Yn{constructor(t=new ft,e=new ft,n=new ft,s=new ft){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new ft){const n=e,s=this.v0,a=this.v1,o=this.v2,r=this.v3;return n.set(wa(t,s.x,a.x,o.x,r.x),wa(t,s.y,a.y,o.y,r.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Kv extends Yn{constructor(t=new G,e=new G,n=new G,s=new G){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new G){const n=e,s=this.v0,a=this.v1,o=this.v2,r=this.v3;return n.set(wa(t,s.x,a.x,o.x,r.x),wa(t,s.y,a.y,o.y,r.y),wa(t,s.z,a.z,o.z,r.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Zu extends Yn{constructor(t=new ft,e=new ft){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new ft){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new ft){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Yv extends Yn{constructor(t=new G,e=new G){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new G){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new G){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class ju extends Yn{constructor(t=new ft,e=new ft,n=new ft){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new ft){const n=e,s=this.v0,a=this.v1,o=this.v2;return n.set(ba(t,s.x,a.x,o.x),ba(t,s.y,a.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Zv extends Yn{constructor(t=new G,e=new G,n=new G){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new G){const n=e,s=this.v0,a=this.v1,o=this.v2;return n.set(ba(t,s.x,a.x,o.x),ba(t,s.y,a.y,o.y),ba(t,s.z,a.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Ju extends Yn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new ft){const n=e,s=this.points,a=(s.length-1)*t,o=Math.floor(a),r=a-o,l=s[o===0?o:o-1],c=s[o],d=s[o>s.length-2?s.length-1:o+1],u=s[o>s.length-3?s.length-1:o+2];return n.set(zh(r,l.x,c.x,d.x,u.x),zh(r,l.y,c.y,d.y,u.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new ft().fromArray(s))}return this}}var Hl=Object.freeze({__proto__:null,ArcCurve:Ov,CatmullRomCurve3:Ku,CubicBezierCurve:Yu,CubicBezierCurve3:Kv,EllipseCurve:vc,LineCurve:Zu,LineCurve3:Yv,QuadraticBezierCurve:ju,QuadraticBezierCurve3:Zv,SplineCurve:Ju});class jv extends Yn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Hl[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),s=this.getCurveLengths();let a=0;for(;a<s.length;){if(s[a]>=n){const o=s[a]-n,r=this.curves[a],l=r.getLength(),c=l===0?0:1-o/l;return r.getPointAt(c,e)}a++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let s=0,a=this.curves;s<a.length;s++){const o=a[s],r=o.isEllipseCurve?t*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?t*o.points.length:t,l=o.getPoints(r);for(let c=0;c<l.length;c++){const d=l[c];n&&n.equals(d)||(e.push(d),n=d)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const s=t.curves[e];this.curves.push(new Hl[s.type]().fromJSON(s))}return this}}class Gl extends jv{constructor(t){super(),this.type="Path",this.currentPoint=new ft,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new Zu(this.currentPoint.clone(),new ft(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){const a=new ju(this.currentPoint.clone(),new ft(t,e),new ft(n,s));return this.curves.push(a),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,a,o){const r=new Yu(this.currentPoint.clone(),new ft(t,e),new ft(n,s),new ft(a,o));return this.curves.push(r),this.currentPoint.set(a,o),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new Ju(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,a,o){const r=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+r,e+l,n,s,a,o),this}absarc(t,e,n,s,a,o){return this.absellipse(t,e,n,n,s,a,o),this}ellipse(t,e,n,s,a,o,r,l){const c=this.currentPoint.x,d=this.currentPoint.y;return this.absellipse(t+c,e+d,n,s,a,o,r,l),this}absellipse(t,e,n,s,a,o,r,l){const c=new vc(t,e,n,s,a,o,r,l);if(this.curves.length>0){const u=c.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(c);const d=c.getPoint(1);return this.currentPoint.copy(d),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class _c extends Ue{constructor(t=[new ft(0,-.5),new ft(.5,0),new ft(0,.5)],e=12,n=0,s=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:t,segments:e,phiStart:n,phiLength:s},e=Math.floor(e),s=$e(s,0,Math.PI*2);const a=[],o=[],r=[],l=[],c=[],d=1/e,u=new G,f=new ft,m=new G,p=new G,S=new G;let g=0,h=0;for(let b=0;b<=t.length-1;b++)switch(b){case 0:g=t[b+1].x-t[b].x,h=t[b+1].y-t[b].y,m.x=h*1,m.y=-g,m.z=h*0,S.copy(m),m.normalize(),l.push(m.x,m.y,m.z);break;case t.length-1:l.push(S.x,S.y,S.z);break;default:g=t[b+1].x-t[b].x,h=t[b+1].y-t[b].y,m.x=h*1,m.y=-g,m.z=h*0,p.copy(m),m.x+=S.x,m.y+=S.y,m.z+=S.z,m.normalize(),l.push(m.x,m.y,m.z),S.copy(p)}for(let b=0;b<=e;b++){const w=n+b*d*s,y=Math.sin(w),C=Math.cos(w);for(let v=0;v<=t.length-1;v++){u.x=t[v].x*y,u.y=t[v].y,u.z=t[v].x*C,o.push(u.x,u.y,u.z),f.x=b/e,f.y=v/(t.length-1),r.push(f.x,f.y);const T=l[3*v+0]*y,P=l[3*v+1],x=l[3*v+0]*C;c.push(T,P,x)}}for(let b=0;b<e;b++)for(let w=0;w<t.length-1;w++){const y=w+b*t.length,C=y,v=y+t.length,T=y+t.length+1,P=y+1;a.push(C,v,P),a.push(T,P,v)}this.setIndex(a),this.setAttribute("position",new pe(o,3)),this.setAttribute("uv",new pe(r,2)),this.setAttribute("normal",new pe(c,3))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new _c(t.points,t.segments,t.phiStart,t.phiLength)}}class We extends _c{constructor(t=1,e=1,n=4,s=8){const a=new Gl;a.absarc(0,-e/2,t,Math.PI*1.5,0),a.absarc(0,e/2,t,0,Math.PI*.5),super(a.getPoints(n),s),this.type="CapsuleGeometry",this.parameters={radius:t,length:e,capSegments:n,radialSegments:s}}static fromJSON(t){return new We(t.radius,t.length,t.capSegments,t.radialSegments)}}class Ta extends Ue{constructor(t=1,e=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:s},e=Math.max(3,e);const a=[],o=[],r=[],l=[],c=new G,d=new ft;o.push(0,0,0),r.push(0,0,1),l.push(.5,.5);for(let u=0,f=3;u<=e;u++,f+=3){const m=n+u/e*s;c.x=t*Math.cos(m),c.y=t*Math.sin(m),o.push(c.x,c.y,c.z),r.push(0,0,1),d.x=(o[f]/t+1)/2,d.y=(o[f+1]/t+1)/2,l.push(d.x,d.y)}for(let u=1;u<=e;u++)a.push(u,u+1,0);this.setIndex(a),this.setAttribute("position",new pe(o,3)),this.setAttribute("normal",new pe(r,3)),this.setAttribute("uv",new pe(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ta(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class lt extends Ue{constructor(t=1,e=1,n=1,s=32,a=1,o=!1,r=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:a,openEnded:o,thetaStart:r,thetaLength:l};const c=this;s=Math.floor(s),a=Math.floor(a);const d=[],u=[],f=[],m=[];let p=0;const S=[],g=n/2;let h=0;b(),o===!1&&(t>0&&w(!0),e>0&&w(!1)),this.setIndex(d),this.setAttribute("position",new pe(u,3)),this.setAttribute("normal",new pe(f,3)),this.setAttribute("uv",new pe(m,2));function b(){const y=new G,C=new G;let v=0;const T=(e-t)/n;for(let P=0;P<=a;P++){const x=[],M=P/a,_=M*(e-t)+t;for(let N=0;N<=s;N++){const U=N/s,H=U*l+r,z=Math.sin(H),L=Math.cos(H);C.x=_*z,C.y=-M*n+g,C.z=_*L,u.push(C.x,C.y,C.z),y.set(z,T,L).normalize(),f.push(y.x,y.y,y.z),m.push(U,1-M),x.push(p++)}S.push(x)}for(let P=0;P<s;P++)for(let x=0;x<a;x++){const M=S[x][P],_=S[x+1][P],N=S[x+1][P+1],U=S[x][P+1];(t>0||x!==0)&&(d.push(M,_,U),v+=3),(e>0||x!==a-1)&&(d.push(_,N,U),v+=3)}c.addGroup(h,v,0),h+=v}function w(y){const C=p,v=new ft,T=new G;let P=0;const x=y===!0?t:e,M=y===!0?1:-1;for(let N=1;N<=s;N++)u.push(0,g*M,0),f.push(0,M,0),m.push(.5,.5),p++;const _=p;for(let N=0;N<=s;N++){const H=N/s*l+r,z=Math.cos(H),L=Math.sin(H);T.x=x*L,T.y=g*M,T.z=x*z,u.push(T.x,T.y,T.z),f.push(0,M,0),v.x=z*.5+.5,v.y=L*.5*M+.5,m.push(v.x,v.y),p++}for(let N=0;N<s;N++){const U=C+N,H=_+N;y===!0?d.push(H,H+1,U):d.push(H+1,H,U),P+=3}c.addGroup(h,P,y===!0?1:2),h+=P}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new lt(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Ie extends lt{constructor(t=1,e=1,n=32,s=1,a=!1,o=0,r=Math.PI*2){super(0,t,e,n,s,a,o,r),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:s,openEnded:a,thetaStart:o,thetaLength:r}}static fromJSON(t){return new Ie(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class qo extends Ue{constructor(t=[],e=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:s};const a=[],o=[];r(s),c(n),d(),this.setAttribute("position",new pe(a,3)),this.setAttribute("normal",new pe(a.slice(),3)),this.setAttribute("uv",new pe(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function r(b){const w=new G,y=new G,C=new G;for(let v=0;v<e.length;v+=3)m(e[v+0],w),m(e[v+1],y),m(e[v+2],C),l(w,y,C,b)}function l(b,w,y,C){const v=C+1,T=[];for(let P=0;P<=v;P++){T[P]=[];const x=b.clone().lerp(y,P/v),M=w.clone().lerp(y,P/v),_=v-P;for(let N=0;N<=_;N++)N===0&&P===v?T[P][N]=x:T[P][N]=x.clone().lerp(M,N/_)}for(let P=0;P<v;P++)for(let x=0;x<2*(v-P)-1;x++){const M=Math.floor(x/2);x%2===0?(f(T[P][M+1]),f(T[P+1][M]),f(T[P][M])):(f(T[P][M+1]),f(T[P+1][M+1]),f(T[P+1][M]))}}function c(b){const w=new G;for(let y=0;y<a.length;y+=3)w.x=a[y+0],w.y=a[y+1],w.z=a[y+2],w.normalize().multiplyScalar(b),a[y+0]=w.x,a[y+1]=w.y,a[y+2]=w.z}function d(){const b=new G;for(let w=0;w<a.length;w+=3){b.x=a[w+0],b.y=a[w+1],b.z=a[w+2];const y=g(b)/2/Math.PI+.5,C=h(b)/Math.PI+.5;o.push(y,1-C)}p(),u()}function u(){for(let b=0;b<o.length;b+=6){const w=o[b+0],y=o[b+2],C=o[b+4],v=Math.max(w,y,C),T=Math.min(w,y,C);v>.9&&T<.1&&(w<.2&&(o[b+0]+=1),y<.2&&(o[b+2]+=1),C<.2&&(o[b+4]+=1))}}function f(b){a.push(b.x,b.y,b.z)}function m(b,w){const y=b*3;w.x=t[y+0],w.y=t[y+1],w.z=t[y+2]}function p(){const b=new G,w=new G,y=new G,C=new G,v=new ft,T=new ft,P=new ft;for(let x=0,M=0;x<a.length;x+=9,M+=6){b.set(a[x+0],a[x+1],a[x+2]),w.set(a[x+3],a[x+4],a[x+5]),y.set(a[x+6],a[x+7],a[x+8]),v.set(o[M+0],o[M+1]),T.set(o[M+2],o[M+3]),P.set(o[M+4],o[M+5]),C.copy(b).add(w).add(y).divideScalar(3);const _=g(C);S(v,M+0,b,_),S(T,M+2,w,_),S(P,M+4,y,_)}}function S(b,w,y,C){C<0&&b.x===1&&(o[w]=b.x-1),y.x===0&&y.z===0&&(o[w]=C/2/Math.PI+.5)}function g(b){return Math.atan2(b.z,-b.x)}function h(b){return Math.atan2(-b.y,Math.sqrt(b.x*b.x+b.z*b.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new qo(t.vertices,t.indices,t.radius,t.details)}}class Mc extends qo{constructor(t=1,e=0){const n=(1+Math.sqrt(5))/2,s=1/n,a=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-s,-n,0,-s,n,0,s,-n,0,s,n,-s,-n,0,-s,n,0,s,-n,0,s,n,0,-n,0,-s,n,0,-s,-n,0,s,n,0,s],o=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(a,o,t,e),this.type="DodecahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new Mc(t.radius,t.detail)}}class Qu extends Gl{constructor(t){super(t),this.uuid=rs(),this.type="Shape",this.holes=[]}getPointsHoles(t){const e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){const t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){const s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const s=t.holes[e];this.holes.push(new Gl().fromJSON(s))}return this}}const Jv={triangulate:function(i,t,e=2){const n=t&&t.length,s=n?t[0]*e:i.length;let a=tf(i,0,s,e,!0);const o=[];if(!a||a.next===a.prev)return o;let r,l,c,d,u,f,m;if(n&&(a=ix(i,t,a,e)),i.length>80*e){r=c=i[0],l=d=i[1];for(let p=e;p<s;p+=e)u=i[p],f=i[p+1],u<r&&(r=u),f<l&&(l=f),u>c&&(c=u),f>d&&(d=f);m=Math.max(c-r,d-l),m=m!==0?32767/m:0}return Ba(a,o,e,r,l,m,0),o}};function tf(i,t,e,n,s){let a,o;if(s===px(i,t,e,n)>0)for(a=t;a<e;a+=n)o=Fh(a,i[a],i[a+1],o);else for(a=e-n;a>=t;a-=n)o=Fh(a,i[a],i[a+1],o);return o&&Ko(o,o.next)&&(Ua(o),o=o.next),o}function is(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(Ko(e,e.next)||Pe(e.prev,e,e.next)===0)){if(Ua(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function Ba(i,t,e,n,s,a,o){if(!i)return;!o&&a&&lx(i,n,s,a);let r=i,l,c;for(;i.prev!==i.next;){if(l=i.prev,c=i.next,a?tx(i,n,s,a):Qv(i)){t.push(l.i/e|0),t.push(i.i/e|0),t.push(c.i/e|0),Ua(i),i=c.next,r=c.next;continue}if(i=c,i===r){o?o===1?(i=ex(is(i),t,e),Ba(i,t,e,n,s,a,2)):o===2&&nx(i,t,e,n,s,a):Ba(is(i),t,e,n,s,a,1);break}}}function Qv(i){const t=i.prev,e=i,n=i.next;if(Pe(t,e,n)>=0)return!1;const s=t.x,a=e.x,o=n.x,r=t.y,l=e.y,c=n.y,d=s<a?s<o?s:o:a<o?a:o,u=r<l?r<c?r:c:l<c?l:c,f=s>a?s>o?s:o:a>o?a:o,m=r>l?r>c?r:c:l>c?l:c;let p=n.next;for(;p!==t;){if(p.x>=d&&p.x<=f&&p.y>=u&&p.y<=m&&Is(s,r,a,l,o,c,p.x,p.y)&&Pe(p.prev,p,p.next)>=0)return!1;p=p.next}return!0}function tx(i,t,e,n){const s=i.prev,a=i,o=i.next;if(Pe(s,a,o)>=0)return!1;const r=s.x,l=a.x,c=o.x,d=s.y,u=a.y,f=o.y,m=r<l?r<c?r:c:l<c?l:c,p=d<u?d<f?d:f:u<f?u:f,S=r>l?r>c?r:c:l>c?l:c,g=d>u?d>f?d:f:u>f?u:f,h=Vl(m,p,t,e,n),b=Vl(S,g,t,e,n);let w=i.prevZ,y=i.nextZ;for(;w&&w.z>=h&&y&&y.z<=b;){if(w.x>=m&&w.x<=S&&w.y>=p&&w.y<=g&&w!==s&&w!==o&&Is(r,d,l,u,c,f,w.x,w.y)&&Pe(w.prev,w,w.next)>=0||(w=w.prevZ,y.x>=m&&y.x<=S&&y.y>=p&&y.y<=g&&y!==s&&y!==o&&Is(r,d,l,u,c,f,y.x,y.y)&&Pe(y.prev,y,y.next)>=0))return!1;y=y.nextZ}for(;w&&w.z>=h;){if(w.x>=m&&w.x<=S&&w.y>=p&&w.y<=g&&w!==s&&w!==o&&Is(r,d,l,u,c,f,w.x,w.y)&&Pe(w.prev,w,w.next)>=0)return!1;w=w.prevZ}for(;y&&y.z<=b;){if(y.x>=m&&y.x<=S&&y.y>=p&&y.y<=g&&y!==s&&y!==o&&Is(r,d,l,u,c,f,y.x,y.y)&&Pe(y.prev,y,y.next)>=0)return!1;y=y.nextZ}return!0}function ex(i,t,e){let n=i;do{const s=n.prev,a=n.next.next;!Ko(s,a)&&ef(s,n,n.next,a)&&Na(s,a)&&Na(a,s)&&(t.push(s.i/e|0),t.push(n.i/e|0),t.push(a.i/e|0),Ua(n),Ua(n.next),n=i=a),n=n.next}while(n!==i);return is(n)}function nx(i,t,e,n,s,a){let o=i;do{let r=o.next.next;for(;r!==o.prev;){if(o.i!==r.i&&dx(o,r)){let l=nf(o,r);o=is(o,o.next),l=is(l,l.next),Ba(o,t,e,n,s,a,0),Ba(l,t,e,n,s,a,0);return}r=r.next}o=o.next}while(o!==i)}function ix(i,t,e,n){const s=[];let a,o,r,l,c;for(a=0,o=t.length;a<o;a++)r=t[a]*n,l=a<o-1?t[a+1]*n:i.length,c=tf(i,r,l,n,!1),c===c.next&&(c.steiner=!0),s.push(hx(c));for(s.sort(sx),a=0;a<s.length;a++)e=ax(s[a],e);return e}function sx(i,t){return i.x-t.x}function ax(i,t){const e=ox(i,t);if(!e)return t;const n=nf(e,i);return is(n,n.next),is(e,e.next)}function ox(i,t){let e=t,n=-1/0,s;const a=i.x,o=i.y;do{if(o<=e.y&&o>=e.next.y&&e.next.y!==e.y){const f=e.x+(o-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(f<=a&&f>n&&(n=f,s=e.x<e.next.x?e:e.next,f===a))return s}e=e.next}while(e!==t);if(!s)return null;const r=s,l=s.x,c=s.y;let d=1/0,u;e=s;do a>=e.x&&e.x>=l&&a!==e.x&&Is(o<c?a:n,o,l,c,o<c?n:a,o,e.x,e.y)&&(u=Math.abs(o-e.y)/(a-e.x),Na(e,i)&&(u<d||u===d&&(e.x>s.x||e.x===s.x&&rx(s,e)))&&(s=e,d=u)),e=e.next;while(e!==r);return s}function rx(i,t){return Pe(i.prev,i,t.prev)<0&&Pe(t.next,i,i.next)<0}function lx(i,t,e,n){let s=i;do s.z===0&&(s.z=Vl(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,cx(s)}function cx(i){let t,e,n,s,a,o,r,l,c=1;do{for(e=i,i=null,a=null,o=0;e;){for(o++,n=e,r=0,t=0;t<c&&(r++,n=n.nextZ,!!n);t++);for(l=c;r>0||l>0&&n;)r!==0&&(l===0||!n||e.z<=n.z)?(s=e,e=e.nextZ,r--):(s=n,n=n.nextZ,l--),a?a.nextZ=s:i=s,s.prevZ=a,a=s;e=n}a.nextZ=null,c*=2}while(o>1);return i}function Vl(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function hx(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function Is(i,t,e,n,s,a,o,r){return(s-o)*(t-r)>=(i-o)*(a-r)&&(i-o)*(n-r)>=(e-o)*(t-r)&&(e-o)*(a-r)>=(s-o)*(n-r)}function dx(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!ux(i,t)&&(Na(i,t)&&Na(t,i)&&fx(i,t)&&(Pe(i.prev,i,t.prev)||Pe(i,t.prev,t))||Ko(i,t)&&Pe(i.prev,i,i.next)>0&&Pe(t.prev,t,t.next)>0)}function Pe(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function Ko(i,t){return i.x===t.x&&i.y===t.y}function ef(i,t,e,n){const s=_o(Pe(i,t,e)),a=_o(Pe(i,t,n)),o=_o(Pe(e,n,i)),r=_o(Pe(e,n,t));return!!(s!==a&&o!==r||s===0&&xo(i,e,t)||a===0&&xo(i,n,t)||o===0&&xo(e,i,n)||r===0&&xo(e,t,n))}function xo(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function _o(i){return i>0?1:i<0?-1:0}function ux(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&ef(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function Na(i,t){return Pe(i.prev,i,i.next)<0?Pe(i,t,i.next)>=0&&Pe(i,i.prev,t)>=0:Pe(i,t,i.prev)<0||Pe(i,i.next,t)<0}function fx(i,t){let e=i,n=!1;const s=(i.x+t.x)/2,a=(i.y+t.y)/2;do e.y>a!=e.next.y>a&&e.next.y!==e.y&&s<(e.next.x-e.x)*(a-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function nf(i,t){const e=new $l(i.i,i.x,i.y),n=new $l(t.i,t.x,t.y),s=i.next,a=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,a.next=n,n.prev=a,n}function Fh(i,t,e,n){const s=new $l(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Ua(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function $l(i,t,e){this.i=i,this.x=t,this.y=e,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}function px(i,t,e,n){let s=0;for(let a=t,o=e-n;a<e;a+=n)s+=(i[o]-i[a])*(i[a+1]+i[o+1]),o=a;return s}class Ea{static area(t){const e=t.length;let n=0;for(let s=e-1,a=0;a<e;s=a++)n+=t[s].x*t[a].y-t[a].x*t[s].y;return n*.5}static isClockWise(t){return Ea.area(t)<0}static triangulateShape(t,e){const n=[],s=[],a=[];Oh(t),Hh(n,t);let o=t.length;e.forEach(Oh);for(let l=0;l<e.length;l++)s.push(o),o+=e[l].length,Hh(n,e[l]);const r=Jv.triangulate(n,s);for(let l=0;l<r.length;l+=3)a.push(r.slice(l,l+3));return a}}function Oh(i){const t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function Hh(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}class yc extends Ue{constructor(t=new Qu([new ft(.5,.5),new ft(-.5,.5),new ft(-.5,-.5),new ft(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];const n=this,s=[],a=[];for(let r=0,l=t.length;r<l;r++){const c=t[r];o(c)}this.setAttribute("position",new pe(s,3)),this.setAttribute("uv",new pe(a,2)),this.computeVertexNormals();function o(r){const l=[],c=e.curveSegments!==void 0?e.curveSegments:12,d=e.steps!==void 0?e.steps:1,u=e.depth!==void 0?e.depth:1;let f=e.bevelEnabled!==void 0?e.bevelEnabled:!0,m=e.bevelThickness!==void 0?e.bevelThickness:.2,p=e.bevelSize!==void 0?e.bevelSize:m-.1,S=e.bevelOffset!==void 0?e.bevelOffset:0,g=e.bevelSegments!==void 0?e.bevelSegments:3;const h=e.extrudePath,b=e.UVGenerator!==void 0?e.UVGenerator:mx;let w,y=!1,C,v,T,P;h&&(w=h.getSpacedPoints(d),y=!0,f=!1,C=h.computeFrenetFrames(d,!1),v=new G,T=new G,P=new G),f||(g=0,m=0,p=0,S=0);const x=r.extractPoints(c);let M=x.shape;const _=x.holes;if(!Ea.isClockWise(M)){M=M.reverse();for(let st=0,pt=_.length;st<pt;st++){const O=_[st];Ea.isClockWise(O)&&(_[st]=O.reverse())}}const U=Ea.triangulateShape(M,_),H=M;for(let st=0,pt=_.length;st<pt;st++){const O=_[st];M=M.concat(O)}function z(st,pt,O){return pt||console.error("THREE.ExtrudeGeometry: vec does not exist"),st.clone().addScaledVector(pt,O)}const L=M.length,A=U.length;function E(st,pt,O){let Ft,mt,Dt;const _t=st.x-pt.x,Yt=st.y-pt.y,It=O.x-st.x,D=O.y-st.y,R=_t*_t+Yt*Yt,J=_t*D-Yt*It;if(Math.abs(J)>Number.EPSILON){const ot=Math.sqrt(R),ut=Math.sqrt(It*It+D*D),rt=pt.x-Yt/ot,Gt=pt.y+_t/ot,St=O.x-D/ut,Lt=O.y+It/ut,ce=((St-rt)*D-(Lt-Gt)*It)/(_t*D-Yt*It);Ft=rt+_t*ce-st.x,mt=Gt+Yt*ce-st.y;const gt=Ft*Ft+mt*mt;if(gt<=2)return new ft(Ft,mt);Dt=Math.sqrt(gt/2)}else{let ot=!1;_t>Number.EPSILON?It>Number.EPSILON&&(ot=!0):_t<-Number.EPSILON?It<-Number.EPSILON&&(ot=!0):Math.sign(Yt)===Math.sign(D)&&(ot=!0),ot?(Ft=-Yt,mt=_t,Dt=Math.sqrt(R)):(Ft=_t,mt=Yt,Dt=Math.sqrt(R/2))}return new ft(Ft/Dt,mt/Dt)}const I=[];for(let st=0,pt=H.length,O=pt-1,Ft=st+1;st<pt;st++,O++,Ft++)O===pt&&(O=0),Ft===pt&&(Ft=0),I[st]=E(H[st],H[O],H[Ft]);const V=[];let $,Q=I.concat();for(let st=0,pt=_.length;st<pt;st++){const O=_[st];$=[];for(let Ft=0,mt=O.length,Dt=mt-1,_t=Ft+1;Ft<mt;Ft++,Dt++,_t++)Dt===mt&&(Dt=0),_t===mt&&(_t=0),$[Ft]=E(O[Ft],O[Dt],O[_t]);V.push($),Q=Q.concat($)}for(let st=0;st<g;st++){const pt=st/g,O=m*Math.cos(pt*Math.PI/2),Ft=p*Math.sin(pt*Math.PI/2)+S;for(let mt=0,Dt=H.length;mt<Dt;mt++){const _t=z(H[mt],I[mt],Ft);dt(_t.x,_t.y,-O)}for(let mt=0,Dt=_.length;mt<Dt;mt++){const _t=_[mt];$=V[mt];for(let Yt=0,It=_t.length;Yt<It;Yt++){const D=z(_t[Yt],$[Yt],Ft);dt(D.x,D.y,-O)}}}const it=p+S;for(let st=0;st<L;st++){const pt=f?z(M[st],Q[st],it):M[st];y?(T.copy(C.normals[0]).multiplyScalar(pt.x),v.copy(C.binormals[0]).multiplyScalar(pt.y),P.copy(w[0]).add(T).add(v),dt(P.x,P.y,P.z)):dt(pt.x,pt.y,0)}for(let st=1;st<=d;st++)for(let pt=0;pt<L;pt++){const O=f?z(M[pt],Q[pt],it):M[pt];y?(T.copy(C.normals[st]).multiplyScalar(O.x),v.copy(C.binormals[st]).multiplyScalar(O.y),P.copy(w[st]).add(T).add(v),dt(P.x,P.y,P.z)):dt(O.x,O.y,u/d*st)}for(let st=g-1;st>=0;st--){const pt=st/g,O=m*Math.cos(pt*Math.PI/2),Ft=p*Math.sin(pt*Math.PI/2)+S;for(let mt=0,Dt=H.length;mt<Dt;mt++){const _t=z(H[mt],I[mt],Ft);dt(_t.x,_t.y,u+O)}for(let mt=0,Dt=_.length;mt<Dt;mt++){const _t=_[mt];$=V[mt];for(let Yt=0,It=_t.length;Yt<It;Yt++){const D=z(_t[Yt],$[Yt],Ft);y?dt(D.x,D.y+w[d-1].y,w[d-1].x+O):dt(D.x,D.y,u+O)}}}W(),j();function W(){const st=s.length/3;if(f){let pt=0,O=L*pt;for(let Ft=0;Ft<A;Ft++){const mt=U[Ft];Rt(mt[2]+O,mt[1]+O,mt[0]+O)}pt=d+g*2,O=L*pt;for(let Ft=0;Ft<A;Ft++){const mt=U[Ft];Rt(mt[0]+O,mt[1]+O,mt[2]+O)}}else{for(let pt=0;pt<A;pt++){const O=U[pt];Rt(O[2],O[1],O[0])}for(let pt=0;pt<A;pt++){const O=U[pt];Rt(O[0]+L*d,O[1]+L*d,O[2]+L*d)}}n.addGroup(st,s.length/3-st,0)}function j(){const st=s.length/3;let pt=0;ht(H,pt),pt+=H.length;for(let O=0,Ft=_.length;O<Ft;O++){const mt=_[O];ht(mt,pt),pt+=mt.length}n.addGroup(st,s.length/3-st,1)}function ht(st,pt){let O=st.length;for(;--O>=0;){const Ft=O;let mt=O-1;mt<0&&(mt=st.length-1);for(let Dt=0,_t=d+g*2;Dt<_t;Dt++){const Yt=L*Dt,It=L*(Dt+1),D=pt+Ft+Yt,R=pt+mt+Yt,J=pt+mt+It,ot=pt+Ft+It;Pt(D,R,J,ot)}}}function dt(st,pt,O){l.push(st),l.push(pt),l.push(O)}function Rt(st,pt,O){kt(st),kt(pt),kt(O);const Ft=s.length/3,mt=b.generateTopUV(n,s,Ft-3,Ft-2,Ft-1);Kt(mt[0]),Kt(mt[1]),Kt(mt[2])}function Pt(st,pt,O,Ft){kt(st),kt(pt),kt(Ft),kt(pt),kt(O),kt(Ft);const mt=s.length/3,Dt=b.generateSideWallUV(n,s,mt-6,mt-3,mt-2,mt-1);Kt(Dt[0]),Kt(Dt[1]),Kt(Dt[3]),Kt(Dt[1]),Kt(Dt[2]),Kt(Dt[3])}function kt(st){s.push(l[st*3+0]),s.push(l[st*3+1]),s.push(l[st*3+2])}function Kt(st){a.push(st.x),a.push(st.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return gx(e,n,t)}static fromJSON(t,e){const n=[];for(let a=0,o=t.shapes.length;a<o;a++){const r=e[t.shapes[a]];n.push(r)}const s=t.options.extrudePath;return s!==void 0&&(t.options.extrudePath=new Hl[s.type]().fromJSON(s)),new yc(n,t.options)}}const mx={generateTopUV:function(i,t,e,n,s){const a=t[e*3],o=t[e*3+1],r=t[n*3],l=t[n*3+1],c=t[s*3],d=t[s*3+1];return[new ft(a,o),new ft(r,l),new ft(c,d)]},generateSideWallUV:function(i,t,e,n,s,a){const o=t[e*3],r=t[e*3+1],l=t[e*3+2],c=t[n*3],d=t[n*3+1],u=t[n*3+2],f=t[s*3],m=t[s*3+1],p=t[s*3+2],S=t[a*3],g=t[a*3+1],h=t[a*3+2];return Math.abs(r-d)<Math.abs(o-c)?[new ft(o,1-l),new ft(c,1-u),new ft(f,1-p),new ft(S,1-h)]:[new ft(r,1-l),new ft(d,1-u),new ft(m,1-p),new ft(g,1-h)]}};function gx(i,t,e){if(e.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){const a=i[n];e.shapes.push(a.uuid)}else e.shapes.push(i.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}class ss extends qo{constructor(t=1,e=0){const n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],s=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,s,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new ss(t.radius,t.detail)}}class Ei extends Ue{constructor(t=.5,e=1,n=32,s=1,a=0,o=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:t,outerRadius:e,thetaSegments:n,phiSegments:s,thetaStart:a,thetaLength:o},n=Math.max(3,n),s=Math.max(1,s);const r=[],l=[],c=[],d=[];let u=t;const f=(e-t)/s,m=new G,p=new ft;for(let S=0;S<=s;S++){for(let g=0;g<=n;g++){const h=a+g/n*o;m.x=u*Math.cos(h),m.y=u*Math.sin(h),l.push(m.x,m.y,m.z),c.push(0,0,1),p.x=(m.x/e+1)/2,p.y=(m.y/e+1)/2,d.push(p.x,p.y)}u+=f}for(let S=0;S<s;S++){const g=S*(n+1);for(let h=0;h<n;h++){const b=h+g,w=b,y=b+n+1,C=b+n+2,v=b+1;r.push(w,y,v),r.push(y,C,v)}}this.setIndex(r),this.setAttribute("position",new pe(l,3)),this.setAttribute("normal",new pe(c,3)),this.setAttribute("uv",new pe(d,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ei(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}}class Xt extends Ue{constructor(t=1,e=32,n=16,s=0,a=Math.PI*2,o=0,r=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:a,thetaStart:o,thetaLength:r},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const l=Math.min(o+r,Math.PI);let c=0;const d=[],u=new G,f=new G,m=[],p=[],S=[],g=[];for(let h=0;h<=n;h++){const b=[],w=h/n;let y=0;h===0&&o===0?y=.5/e:h===n&&l===Math.PI&&(y=-.5/e);for(let C=0;C<=e;C++){const v=C/e;u.x=-t*Math.cos(s+v*a)*Math.sin(o+w*r),u.y=t*Math.cos(o+w*r),u.z=t*Math.sin(s+v*a)*Math.sin(o+w*r),p.push(u.x,u.y,u.z),f.copy(u).normalize(),S.push(f.x,f.y,f.z),g.push(v+y,1-w),b.push(c++)}d.push(b)}for(let h=0;h<n;h++)for(let b=0;b<e;b++){const w=d[h][b+1],y=d[h][b],C=d[h+1][b],v=d[h+1][b+1];(h!==0||o>0)&&m.push(w,y,v),(h!==n-1||l<Math.PI)&&m.push(y,C,v)}this.setIndex(m),this.setAttribute("position",new pe(p,3)),this.setAttribute("normal",new pe(S,3)),this.setAttribute("uv",new pe(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Xt(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class ie extends Ue{constructor(t=1,e=.4,n=12,s=48,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:s,arc:a},n=Math.floor(n),s=Math.floor(s);const o=[],r=[],l=[],c=[],d=new G,u=new G,f=new G;for(let m=0;m<=n;m++)for(let p=0;p<=s;p++){const S=p/s*a,g=m/n*Math.PI*2;u.x=(t+e*Math.cos(g))*Math.cos(S),u.y=(t+e*Math.cos(g))*Math.sin(S),u.z=e*Math.sin(g),r.push(u.x,u.y,u.z),d.x=t*Math.cos(S),d.y=t*Math.sin(S),f.subVectors(u,d).normalize(),l.push(f.x,f.y,f.z),c.push(p/s),c.push(m/n)}for(let m=1;m<=n;m++)for(let p=1;p<=s;p++){const S=(s+1)*m+p-1,g=(s+1)*(m-1)+p-1,h=(s+1)*(m-1)+p,b=(s+1)*m+p;o.push(S,g,b),o.push(g,h,b)}this.setIndex(o),this.setAttribute("position",new pe(r,3)),this.setAttribute("normal",new pe(l,3)),this.setAttribute("uv",new pe(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ie(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class vx extends Fe{static get type(){return"RawShaderMaterial"}constructor(t){super(t),this.isRawShaderMaterial=!0}}class Ht extends Qs{static get type(){return"MeshStandardMaterial"}constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new Tt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Tt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ru,this.normalScale=new ft(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Sc extends Oe{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Tt(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}class xx extends Sc{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Oe.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Tt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}}const Pr=new _e,Gh=new G,Vh=new G;class sf{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ft(512,512),this.map=null,this.mapPass=null,this.matrix=new _e,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new pc,this._frameExtents=new ft(1,1),this._viewportCount=1,this._viewports=[new be(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;Gh.setFromMatrixPosition(t.matrixWorld),e.position.copy(Gh),Vh.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Vh),e.updateMatrixWorld(),Pr.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Pr),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Pr)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}const $h=new _e,da=new G,kr=new G;class _x extends sf{constructor(){super(new pn(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ft(4,2),this._viewportCount=6,this._viewports=[new be(2,1,1,1),new be(0,1,1,1),new be(3,1,1,1),new be(1,1,1,1),new be(3,0,1,1),new be(1,0,1,1)],this._cubeDirections=[new G(1,0,0),new G(-1,0,0),new G(0,0,1),new G(0,0,-1),new G(0,1,0),new G(0,-1,0)],this._cubeUps=[new G(0,1,0),new G(0,1,0),new G(0,1,0),new G(0,1,0),new G(0,0,1),new G(0,0,-1)]}updateMatrices(t,e=0){const n=this.camera,s=this.matrix,a=t.distance||n.far;a!==n.far&&(n.far=a,n.updateProjectionMatrix()),da.setFromMatrixPosition(t.matrixWorld),n.position.copy(da),kr.copy(n.position),kr.add(this._cubeDirections[e]),n.up.copy(this._cubeUps[e]),n.lookAt(kr),n.updateMatrixWorld(),s.makeTranslation(-da.x,-da.y,-da.z),$h.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix($h)}}class ko extends Sc{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new _x}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}}class Mx extends sf{constructor(){super(new mc(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Wh extends Sc{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Oe.DEFAULT_UP),this.updateMatrix(),this.target=new Oe,this.shadow=new Mx}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}class yx{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=Xh(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const e=Xh();t=(e-this.oldTime)/1e3,this.oldTime=e,this.elapsedTime+=t}return t}}function Xh(){return performance.now()}const qh=new _e;class Sx{constructor(t,e,n=0,s=1/0){this.ray=new uc(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new fc,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,(e.near+e.far)/(e.near-e.far)).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):console.error("THREE.Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return qh.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(qh),this}intersectObject(t,e=!0,n=[]){return Wl(t,this,n,e),n.sort(Kh),n}intersectObjects(t,e=!0,n=[]){for(let s=0,a=t.length;s<a;s++)Wl(t[s],this,n,e);return n.sort(Kh),n}}function Kh(i,t){return i.distance-t.distance}function Wl(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){const a=i.children;for(let o=0,r=a.length;o<r;o++)Wl(a[o],t,e,!0)}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:ec}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=ec);const Ir={wasteland:{id:"wasteland",name:"🏭 暖阳街区 · 蒸汽齿轮城",badge:"齿轮城",skyColor:1920728,fogColor:2450411,fogDensity:42e-5,hemiSkyColor:14412542,hemiGroundColor:8736014,hemiIntensity:.86,sunColor:16774084,sunIntensity:1.68,rimLightColor:16498468,bossLightColor:16096779,portalCoreColor:3547162,portalRingColor:16096779,roadBaseHex:"#c89258",roadPlateHex:"#e0ad72",roadLineHex:"#6b3e1b",roadAccentHex:"#fef3c7",roadPattern:"cobble",curbColor:12090699,curbEmissive:0,cliffColor:12138537,cliffSecondaryColor:8330525,roofColor:12730636,foliageColor:2278750,crystalColor:16096779,crystalEmissive:4528643,bossArmorColor:12138537,bossSecondaryColor:16096779,bossEyeColor:16707722,abyssBaseHex:"#153782",abyssVeinHex:"#2563eb",ambientParticleColor:16707722},sakura:{id:"sakura",name:"🌸 春日花见 · 樱花神社町",badge:"樱花町",skyColor:16769006,fogColor:16772855,fogDensity:.0012,hemiSkyColor:16774650,hemiGroundColor:14261173,hemiIntensity:1.35,sunColor:16773862,sunIntensity:2.32,rimLightColor:16745912,bossLightColor:16739230,portalCoreColor:4003368,portalRingColor:16744118,roadBaseHex:"#f6d8e5",roadPlateHex:"#ffeaf3",roadLineHex:"#a86482",roadAccentHex:"#ffffff",roadPattern:"sakura",curbColor:15052228,curbEmissive:0,cliffColor:14239842,cliffSecondaryColor:10365506,roofColor:4148597,foliageColor:16744629,crystalColor:16498468,crystalEmissive:4333574,bossArmorColor:13121364,bossSecondaryColor:16498468,bossEyeColor:16770284,abyssBaseHex:"#fbd5e5",abyssVeinHex:"#fff7fb",ambientParticleColor:16757713},glacier:{id:"glacier",name:"🍧 极光冰晶 · 薄荷雪糕港",badge:"雪糕港",skyColor:11596031,fogColor:14678271,fogDensity:.0011,hemiSkyColor:15924479,hemiGroundColor:8173780,hemiIntensity:1.38,sunColor:16775659,sunIntensity:2.32,rimLightColor:3718648,bossLightColor:2282478,portalCoreColor:1059394,portalRingColor:3718648,roadBaseHex:"#bae8fa",roadPlateHex:"#e0f6ff",roadLineHex:"#4d92b8",roadAccentHex:"#ffffff",roadPattern:"ice",curbColor:9688560,curbEmissive:0,cliffColor:3709140,cliffSecondaryColor:2255001,roofColor:16055295,foliageColor:7268279,crystalColor:6809849,crystalEmissive:537412,bossArmorColor:2719929,bossSecondaryColor:6809849,bossEyeColor:14742270,abyssBaseHex:"#c8f0ff",abyssVeinHex:"#ffffff",ambientParticleColor:16777215},magma:{id:"magma",name:"🥐 焦糖夕照 · 甜点烘焙坊",badge:"烘焙坊",skyColor:16764064,fogColor:16770248,fogDensity:.0013,hemiSkyColor:16774114,hemiGroundColor:12744772,hemiIntensity:1.32,sunColor:16770229,sunIntensity:2.36,rimLightColor:16749128,bossLightColor:16347926,portalCoreColor:3872782,portalRingColor:16020118,roadBaseHex:"#e6b276",roadPlateHex:"#f6d2a4",roadLineHex:"#6e3918",roadAccentHex:"#fff8eb",roadPattern:"wafer",curbColor:13207632,curbEmissive:0,cliffColor:8142624,cliffSecondaryColor:5514768,roofColor:16020118,foliageColor:5420936,crystalColor:16498468,crystalEmissive:4528643,bossArmorColor:8142624,bossSecondaryColor:16020118,bossEyeColor:16770431,abyssBaseHex:"#f5cfa6",abyssVeinHex:"#fff5e6",ambientParticleColor:16771276},cyberhive:{id:"cyberhive",name:"🎡 星梦嘉年华 · 奇幻游乐园",badge:"游乐园",skyColor:14467839,fogColor:15786239,fogDensity:.0012,hemiSkyColor:16314623,hemiGroundColor:10187471,hemiIntensity:1.35,sunColor:16773336,sunIntensity:2.32,rimLightColor:16020150,bossLightColor:12616956,portalCoreColor:2822732,portalRingColor:16020150,roadBaseHex:"#d5c4f7",roadPlateHex:"#ebe0ff",roadLineHex:"#6c4ba6",roadAccentHex:"#fff9ff",roadPattern:"carnival",curbColor:12031728,curbEmissive:0,cliffColor:7160519,cliffSecondaryColor:4859798,roofColor:16735400,foliageColor:3718648,crystalColor:16436245,crystalEmissive:3874142,bossArmorColor:7160519,bossSecondaryColor:16735400,bossEyeColor:16707722,abyssBaseHex:"#e5d4ff",abyssVeinHex:"#fff7ff",ambientParticleColor:16638023},emerald:{id:"emerald",name:"🌲 翠林仙踪 · 精灵风车谷",badge:"精灵谷",skyColor:12776920,fogColor:15006958,fogDensity:.0012,hemiSkyColor:15925239,hemiGroundColor:7780453,hemiIntensity:1.34,sunColor:16774863,sunIntensity:2.34,rimLightColor:4906624,bossLightColor:8702998,portalCoreColor:1323805,portalRingColor:4906624,roadBaseHex:"#bde09b",roadPlateHex:"#d8f2be",roadLineHex:"#527d39",roadAccentHex:"#fafff0",roadPattern:"forest",curbColor:9356392,curbEmissive:0,cliffColor:8214072,cliffSecondaryColor:5847586,roofColor:15087942,foliageColor:3715072,crystalColor:16436245,crystalEmissive:1786674,bossArmorColor:3706428,bossSecondaryColor:16436245,bossEyeColor:14285213,abyssBaseHex:"#d2f5df",abyssVeinHex:"#f7fff9",ambientParticleColor:14285213},ocean:{id:"ocean",name:"🐳 珊瑚浅湾 · 泡泡海底城",badge:"海底城",skyColor:9103103,fogColor:13235455,fogDensity:.0012,hemiSkyColor:15465727,hemiGroundColor:5089464,hemiIntensity:1.36,sunColor:16775388,sunIntensity:2.34,rimLightColor:3003583,bossLightColor:3718648,portalCoreColor:799810,portalRingColor:16741775,roadBaseHex:"#9ee3e6",roadPlateHex:"#c8f5f7",roadLineHex:"#2b7a87",roadAccentHex:"#ffffff",roadPattern:"ocean",curbColor:7260884,curbEmissive:0,cliffColor:2068387,cliffSecondaryColor:1336179,roofColor:16740488,foliageColor:3003583,crystalColor:16498468,crystalEmissive:999244,bossArmorColor:2068387,bossSecondaryColor:16740488,bossEyeColor:10875900,abyssBaseHex:"#b8f2ff",abyssVeinHex:"#f2fdff",ambientParticleColor:14742270},royal:{id:"royal",name:"🏰 凯旋大道 · 皇家积木城",badge:"积木城",skyColor:10670335,fogColor:14413567,fogDensity:.0012,hemiSkyColor:15923455,hemiGroundColor:11904658,hemiIntensity:1.35,sunColor:16774100,sunIntensity:2.36,rimLightColor:6333946,bossLightColor:16096779,portalCoreColor:1779784,portalRingColor:16436245,roadBaseHex:"#ede3d2",roadPlateHex:"#faf5ec",roadLineHex:"#877660",roadAccentHex:"#ffffff",roadPattern:"royal",curbColor:13942430,curbEmissive:0,cliffColor:3695285,cliffSecondaryColor:2376322,roofColor:14235208,foliageColor:6660877,crystalColor:16436245,crystalEmissive:3876102,bossArmorColor:3695285,bossSecondaryColor:14235208,bossEyeColor:16638023,abyssBaseHex:"#dcebff",abyssVeinHex:"#ffffff",ambientParticleColor:16707722}},Ca=["wasteland","sakura","glacier","magma","cyberhive","emerald","ocean","royal"];function ua(i,t,e,n,s,a){const o=Math.min(a,n*.4,s*.4);i.beginPath(),i.moveTo(t+o,e),i.lineTo(t+n-o,e),i.quadraticCurveTo(t+n,e,t+n,e+o),i.lineTo(t+n,e+s-o),i.quadraticCurveTo(t+n,e+s,t+n-o,e+s),i.lineTo(t+o,e+s),i.quadraticCurveTo(t,e+s,t,e+s-o),i.lineTo(t,e+o),i.quadraticCurveTo(t,e,t+o,e),i.closePath()}function Yh(i){const t=document.createElement("canvas");t.width=1024,t.height=2048;const e=t.getContext("2d"),n=t.width,s=t.height;e.fillStyle=i.roadLineHex,e.fillRect(0,0,n,s);const a=56,o=n-112,r=28,l=s/r,c=new Tt(i.roadBaseHex),d=new Tt(i.roadPlateHex),u=new Tt;for(let w=0;w<r;w++){const y=w*l,C=6,v=o/C,T=w%2===1?v*.5:0;for(let P=-1;P<=C;P++){const x=a+P*v+T,M=Math.max(a,x),N=Math.min(a+o,x+v)-M;if(N<16)continue;const U=Math.abs(Math.sin(w*127.1+P*311.7)*43758.5453)%1,H=Math.abs(Math.sin(w*269.5+P*183.3)*19531.213)%1;u.copy(c).lerp(d,.2+U*.72),H<.28?u.offsetHSL(.008,.03,-.035):H>.74&&u.offsetHSL(-.004,-.02,.028);const z=4.5,L=M+z,A=y+z,E=N-z*2,I=l-z*2;e.fillStyle="#4a2812",ua(e,L-1.5,A-1.5,E+3,I+3,10),e.fill();const V=e.createLinearGradient(L,A,L+E*.45,A+I),$=`#${u.clone().offsetHSL(0,.04,.055).getHexString()}`,Q=`#${u.clone().offsetHSL(0,.04,-.025).getHexString()}`,it=`#${c.clone().offsetHSL(0,.04,-.08).getHexString()}`;if(V.addColorStop(0,$),V.addColorStop(.72,Q),V.addColorStop(1,it),e.fillStyle=V,ua(e,L,A,E,I,8.5),e.fill(),e.strokeStyle="rgba(72, 42, 22, 0.32)",e.lineWidth=3.2,e.beginPath(),e.moveTo(L+8,A+I-2.5),e.lineTo(L+E-8,A+I-2.5),e.quadraticCurveTo(L+E-2.5,A+I-2.5,L+E-2.5,A+I-8),e.lineTo(L+E-2.5,A+8),e.stroke(),e.strokeStyle="rgba(255, 253, 248, 0.78)",e.lineWidth=3,e.beginPath(),e.moveTo(L+6,A+I-10),e.lineTo(L+2.8,A+8),e.quadraticCurveTo(L+2.8,A+2.8,L+8,A+2.8),e.lineTo(L+E-10,A+2.8),e.stroke(),i.roadPattern==="wafer"&&E>45){if(e.strokeStyle="rgba(124, 62, 24, 0.28)",e.lineWidth=2.2,e.beginPath(),e.moveTo(L+12,A+8),e.lineTo(L+E-12,A+I-8),e.moveTo(L+E-12,A+8),e.lineTo(L+12,A+I-8),e.stroke(),U>.52){const W=["#ff5ca8","#38bdf8","#facc15","#4ade80"];e.fillStyle=W[(w+P)%W.length],ua(e,L+E*.42,A+I*.42,14,6,3),e.fill()}}else if(i.roadPattern==="ice"&&E>45)e.strokeStyle="rgba(255, 255, 255, 0.65)",e.lineWidth=2.6,e.beginPath(),e.moveTo(L+14,A+I*.72),e.lineTo(L+E*.55,A+10),e.stroke();else if(i.roadPattern==="sakura"&&U>.48&&E>45){e.fillStyle=H>.5?"#ff7eb6":"#ffb3d1";const W=L+E*(.28+H*.45),j=A+I*(.3+U*.4);e.beginPath(),e.ellipse(W,j,7.5,4.5,U*Math.PI,0,Math.PI*2),e.fill()}else if(i.roadPattern==="forest"&&U>.5&&E>45)e.fillStyle="#4ade80",e.beginPath(),e.arc(L+14,A+I-12,5.5,0,Math.PI*2),e.arc(L+21,A+I-10,4.5,0,Math.PI*2),e.fill();else if(i.roadPattern==="ocean"&&U>.52&&E>45)e.strokeStyle="rgba(255, 255, 255, 0.72)",e.lineWidth=2.2,e.beginPath(),e.arc(L+E*.5,A+I*.5,8+H*5,0,Math.PI*2),e.stroke();else if(i.roadPattern==="carnival"&&U>.5&&E>45)e.fillStyle=(w+P)%2===0?"rgba(255, 92, 168, 0.28)":"rgba(56, 189, 248, 0.28)",e.beginPath(),e.moveTo(L+E*.5,A+10),e.lineTo(L+E-14,A+I*.5),e.lineTo(L+E*.5,A+I-10),e.lineTo(L+14,A+I*.5),e.closePath(),e.fill();else if(U>.62&&E>55){e.strokeStyle="rgba(92, 54, 24, 0.38)",e.lineWidth=2,e.beginPath();const W=L+E*(.28+H*.42);e.moveTo(W,A+1.5),e.lineTo(W+(U-.7)*18,A+I*.34),e.lineTo(W-4,A+I*.52),e.stroke()}}}if(i.roadPattern==="royal"){const y=(n-280)*.5;e.fillStyle="#4a121b",e.fillRect(y-5,0,290,s);const C=e.createLinearGradient(y,0,y+280,0);C.addColorStop(0,"#b82538"),C.addColorStop(.5,"#df3b50"),C.addColorStop(1,"#b82538"),e.fillStyle=C,e.fillRect(y,0,280,s),e.fillStyle="#facc15",e.fillRect(y+10,0,9,s),e.fillRect(y+280-19,0,9,s),e.fillStyle="#fffbeb",e.fillRect(y+12,0,3,s),e.fillRect(y+280-17,0,3,s)}const f=22,m=s/f,p=`#${d.clone().offsetHSL(0,.02,.06).getHexString()}`,S=`#${c.clone().offsetHSL(0,.04,-.08).getHexString()}`;for(let w=0;w<f;w++){const y=w*m;for(const C of[3,n-53]){e.fillStyle="#43240f",ua(e,C-1,y+1,52,m-3,8),e.fill();const v=e.createLinearGradient(C,y,C+50,y+m);v.addColorStop(0,p),v.addColorStop(.65,i.roadPlateHex),v.addColorStop(1,S),e.fillStyle=v,ua(e,C+1,y+2.5,48,m-6.5,6.5),e.fill(),e.strokeStyle="rgba(255, 252, 242, 0.75)",e.lineWidth=2.4,e.strokeRect(C+3.5,y+5,43,m-12)}}const g=e.createLinearGradient(54,0,128,0);g.addColorStop(0,"rgba(96, 54, 20, 0.32)"),g.addColorStop(1,"rgba(96, 54, 20, 0)"),e.fillStyle=g,e.fillRect(54,0,74,s);const h=e.createLinearGradient(n-54,0,n-128,0);h.addColorStop(0,"rgba(96, 54, 20, 0.32)"),h.addColorStop(1,"rgba(96, 54, 20, 0)"),e.fillStyle=h,e.fillRect(n-128,0,74,s),e.lineCap="round",e.lineJoin="round";for(let w=2;w<r-2;w+=3){const y=w*l+l*.5,C=n*.5;e.globalAlpha=.36,e.strokeStyle="#7c4a1e",e.lineWidth=16;for(const v of[0,26]){const T=v===0?44:34;e.beginPath(),e.moveTo(C-T,y+20+v),e.lineTo(C,y-16+v),e.lineTo(C+T,y+20+v),e.stroke()}e.globalAlpha=.62,e.strokeStyle="#fff9eb",e.lineWidth=10;for(const v of[0,26]){const T=v===0?44:34;e.beginPath(),e.moveTo(C-T,y+20+v),e.lineTo(C,y-16+v),e.lineTo(C+T,y+20+v),e.stroke()}}e.globalAlpha=1;const b=new In(t);return b.wrapS=Ke,b.wrapT=Ke,b.anisotropy=8,b}function Zh(i){const t=document.createElement("canvas");t.width=256,t.height=512;const e=t.getContext("2d");e.fillStyle="#000000",e.fillRect(0,0,256,512);const n=new In(t);return n.wrapS=Ke,n.wrapT=Ke,n}function bx(){const i=document.createElement("canvas");i.width=512,i.height=1024;const t=i.getContext("2d"),e=512,n=1024;t.fillStyle="rgb(128, 128, 255)",t.fillRect(0,0,e,n);const s=28,a=e-56,o=28,r=n/o,l=6,c=a/l;for(let u=0;u<o;u++){const f=u*r,m=u%2===1?c*.5:0;t.fillStyle="rgb(128, 178, 240)",t.fillRect(s,f+2,a,2.5),t.fillStyle="rgb(128, 80, 240)",t.fillRect(s,f+r-3.5,a,2.5);for(let p=0;p<=l;p++){const S=s+p*c+m;S>s+4&&S<s+a-4&&(t.fillStyle="rgb(84, 128, 242)",t.fillRect(S-3,f+2,2.2,r-4),t.fillStyle="rgb(174, 128, 242)",t.fillRect(S+1,f+2,2.2,r-4))}}const d=new In(i);return d.wrapS=Ke,d.wrapT=Ke,d}function wx(){const i=document.createElement("canvas");i.width=512,i.height=1024;const t=i.getContext("2d"),e=512,n=1024;t.fillStyle="#a4a4a4",t.fillRect(0,0,e,n);const s=28,a=e-56,o=28,r=n/o,l=6,c=a/l;t.fillStyle="#dcdcdc";for(let u=0;u<o;u++){const f=u*r,m=u%2===1?c*.5:0;t.fillRect(s,f,a,3);for(let p=0;p<=l;p++){const S=s+p*c+m;S>s+3&&S<s+a-3&&t.fillRect(S-1.5,f,3,r)}}const d=new In(i);return d.wrapS=Ke,d.wrapT=Ke,d}function jh(i){const t=document.createElement("canvas");t.width=1024,t.height=1024;const e=t.getContext("2d");e.fillStyle=i.abyssBaseHex,e.fillRect(0,0,1024,1024);for(let s=0;s<18;s++){const a=(s*173+60)%1024,o=(s*289+40)%1024,r=160+s%4*75,l=e.createRadialGradient(a,o,12,a,o,r);l.addColorStop(0,i.abyssVeinHex),l.addColorStop(1,"rgba(255,255,255,0)"),e.globalAlpha=.45,e.fillStyle=l,e.fillRect(a-r,o-r,r*2,r*2)}e.globalAlpha=1;const n=new In(t);return n.wrapS=es,n.wrapT=es,n.repeat.set(2,2),n}function Tx(i,t){const e=document.createElement("canvas");e.width=512,e.height=256;const n=e.getContext("2d"),s=512,a=256;let o="#47f3ff",r="#0ea5e9",l="#0369a1",c="#a5f3fc",d="#082f49";i==="gold"?(o="#fef08a",r="#f59e0b",l="#b45309",c="#fef9c3",d="#451a03"):i==="mega"?(o="#f5d0fe",r="#d946ef",l="#86198f",c="#fae8ff",d="#3b0764"):i==="hazard"&&(o="#fecdd3",r="#f43f5e",l="#9f1239",c="#ffe4e6",d="#4c0519"),n.clearRect(0,0,s,a);const u=()=>{n.beginPath(),n.moveTo(8,22),n.quadraticCurveTo(s*.5,4,s-8,22),n.lineTo(s-8,a-10),n.quadraticCurveTo(s*.5,a-4,8,a-10),n.closePath()};n.save(),u(),n.clip();const f=n.createLinearGradient(0,6,0,a-6);f.addColorStop(0,o),f.addColorStop(.48,r),f.addColorStop(1,l),n.fillStyle=f,n.fillRect(0,0,s,a);const m=n.createRadialGradient(s*.5,a*.5,16,s*.5,a*.5,s*.45);m.addColorStop(0,"rgba(255, 255, 255, 0.36)"),m.addColorStop(.55,"rgba(255, 255, 255, 0.10)"),m.addColorStop(1,"rgba(255, 255, 255, 0)"),n.fillStyle=m,n.fillRect(0,0,s,a),n.fillStyle="rgba(255, 255, 255, 0.26)",n.beginPath(),n.moveTo(58,0),n.lineTo(152,0),n.lineTo(88,a),n.lineTo(10,a),n.closePath(),n.fill(),n.fillStyle="rgba(255, 255, 255, 0.15)",n.beginPath(),n.moveTo(188,0),n.lineTo(232,0),n.lineTo(172,a),n.lineTo(132,a),n.closePath(),n.fill(),n.strokeStyle=c,n.lineWidth=6,n.beginPath(),n.moveTo(20,30),n.quadraticCurveTo(s*.5,14,s-20,30),n.lineTo(s-20,a-20),n.quadraticCurveTo(s*.5,a-14,20,a-20),n.closePath(),n.stroke();for(const S of[26,s-26])for(const g of[42,a-38])n.fillStyle="#0f172a",n.beginPath(),n.arc(S,g,10.5,0,Math.PI*2),n.fill(),n.fillStyle="#facc15",n.beginPath(),n.arc(S,g,7.5,0,Math.PI*2),n.fill(),n.fillStyle="#fef08a",n.beginPath(),n.arc(S-2,g-2,3,0,Math.PI*2),n.fill();if(t){n.save(),n.font='900 138px "Fredoka", "Nunito", "PingFang SC", "Microsoft YaHei", sans-serif',n.textAlign="center",n.textBaseline="middle",n.lineJoin="round",n.lineCap="round";const S=s*.5,g=a*.5+4;n.fillStyle=d,n.fillText(t,S,g+10),n.strokeStyle=d,n.lineWidth=20,n.strokeText(t,S,g+6),n.strokeStyle=d,n.lineWidth=18,n.strokeText(t,S,g);const h=n.createLinearGradient(0,g-55,0,g+55);h.addColorStop(0,"#ffffff"),h.addColorStop(.65,"#f8fafc"),h.addColorStop(1,c),n.fillStyle=h,n.fillText(t,S,g),n.restore()}n.restore(),n.save(),u(),n.strokeStyle="#0f172a",n.lineWidth=8,n.lineJoin="round",n.stroke(),n.restore();const p=new In(e);return p.colorSpace=qe,p.wrapS=Ke,p.wrapT=Ke,p.needsUpdate=!0,p}function Ex(i,t){const e=new Tt(i),n=new Tt(t);return new Fe({uniforms:{uTime:{value:0},uCoreColor:{value:e},uRingColor:{value:n}},transparent:!0,depthWrite:!1,vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      uniform float uTime;
      uniform vec3 uCoreColor;
      uniform vec3 uRingColor;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float pulse = 0.5 + 0.5 * sin(uTime * 2.4 - r * 4.0);
        vec3 col = mix(uCoreColor * 0.55, uCoreColor + uRingColor * 0.28, smoothstep(0.95, 0.1, r) * (0.65 + 0.35 * pulse));
        float alpha = smoothstep(1.05, 0.35, r) * 0.92;
        gl_FragColor = vec4(col, alpha);
      }
    `})}function Cx(i){return new Fe({uniforms:{uTime:{value:0},uBaseColor:{value:new Tt(i.abyssBaseHex)},uVeinColor:{value:new Tt(i.abyssVeinHex)},uAccentColor:{value:new Tt(i.portalRingColor)}},transparent:!0,depthWrite:!1,vertexShader:`
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,fragmentShader:`
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uVeinColor;
      uniform vec3 uAccentColor;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec2 p = vWorldPos.xz * 0.055;
        float n1 = noise2D(p + vec2(uTime * 0.06, uTime * 0.04));
        float n2 = noise2D(p * 1.9 - vec2(uTime * 0.05, -uTime * 0.03));
        float cloud = smoothstep(0.32, 0.85, n1 * 0.62 + n2 * 0.38);

        vec3 col = mix(uBaseColor, uVeinColor, cloud * 0.85);
        col += uAccentColor * pow(cloud, 3.0) * 0.08;

        float distFade = smoothstep(82.0, 18.0, length(vWorldPos.xz));
        gl_FragColor = vec4(col, distFade * 0.92);
      }
    `})}function Ax(i){return new Fe({uniforms:{uTime:{value:0},uColor:{value:new Tt(i)}},transparent:!0,depthWrite:!1,side:Ae,vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        float xMask = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
        float yMask = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
        float puff = sin(vUv.y * 14.0 - uTime * 3.5 + sin(vUv.x * 10.0)) * 0.5 + 0.5;
        vec3 col = mix(uColor, vec3(1.0, 0.99, 0.96), 0.72);
        gl_FragColor = vec4(col, (0.28 + puff * 0.32) * xMask * yMask);
      }
    `})}function Rx(i){return new Fe({uniforms:{uTime:{value:0},uColor:{value:new Tt(i)}},transparent:!0,depthWrite:!1,side:Ae,vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        float wave = sin(vUv.x * 24.0 - uTime * 3.0) * 0.5 + 0.5;
        float rail = smoothstep(0.25, 0.0, vUv.y) + smoothstep(0.75, 1.0, vUv.y);
        float alpha = (rail * 0.45 + 0.12) * (0.75 + wave * 0.25);
        vec3 col = mix(uColor, vec3(1.0, 0.98, 0.92), 0.38);
        gl_FragColor = vec4(col, alpha * 0.42);
      }
    `})}let Lr=null;function Px(){if(Lr)return Lr;const i=document.createElement("canvas");i.width=256,i.height=256;const t=i.getContext("2d");t.clearRect(0,0,256,256);const e=[[128,126,62],[76,138,46],[180,138,46],[102,92,50],[154,94,48],[54,152,32],[202,152,32]];t.fillStyle="#4a2a14";for(const[a,o,r]of e)t.beginPath(),t.arc(a,o,r+6.5,0,Math.PI*2),t.fill();t.fillStyle="#edd8c4";for(const[a,o,r]of e)t.beginPath(),t.arc(a,o+2,r,0,Math.PI*2),t.fill();const n=t.createLinearGradient(0,40,0,185);n.addColorStop(0,"#ffffff"),n.addColorStop(.68,"#fffaf0"),n.addColorStop(1,"#f3e1ce"),t.fillStyle=n;for(const[a,o,r]of e)t.beginPath(),t.arc(a-1.5,o-5,r*.92,0,Math.PI*2),t.fill();t.strokeStyle="#ffffff",t.lineWidth=4.5,t.lineCap="round";for(const[a,o,r]of[[102,92,38],[154,94,36],[76,138,34]])t.beginPath(),t.arc(a-3,o-4,r,Math.PI*1.1,Math.PI*1.82),t.stroke();const s=new In(i);return s.colorSpace=qe,Lr=s,s}let Dr=null;function kx(){if(Dr)return Dr;const i=document.createElement("canvas");i.width=512,i.height=512;const t=i.getContext("2d");t.clearRect(0,0,512,512);const e=[[256,256,152,128,.12],[154,214,96,78,-.25],[352,226,92,82,.3],[182,326,88,72,.2],[336,318,94,74,-.18],[258,156,78,62,.05]],n=[[68,172,22],[438,184,25],[82,336,19],[428,344,21],[244,424,18],[142,108,15],[378,114,16]];t.fillStyle="rgba(92, 56, 28, 0.68)";for(const[a,o,r,l,c]of e)t.beginPath(),t.ellipse(a,o,r+7,l+7,c,0,Math.PI*2),t.fill();for(const[a,o,r]of n)t.beginPath(),t.arc(a,o,r+4,0,Math.PI*2),t.fill();t.fillStyle="#1b1412";for(const[a,o,r,l,c]of e)t.beginPath(),t.ellipse(a,o,r,l,c,0,Math.PI*2),t.fill();for(const[a,o,r]of n)t.beginPath(),t.arc(a,o,r,0,Math.PI*2),t.fill();t.fillStyle="#2d221e";for(const[a,o,r,l,c]of e)t.beginPath(),t.ellipse(a-6,o-6,r*.76,l*.72,c,0,Math.PI*2),t.fill();t.strokeStyle="rgba(255, 252, 245, 0.88)",t.lineWidth=9,t.lineCap="round",t.beginPath(),t.arc(172,206,56,Math.PI*1.08,Math.PI*1.56),t.stroke(),t.lineWidth=7.5,t.beginPath(),t.arc(328,218,52,Math.PI*1.18,Math.PI*1.62),t.stroke(),t.lineWidth=6.5,t.beginPath(),t.arc(196,318,46,Math.PI*.68,Math.PI*1.05),t.stroke(),t.fillStyle="rgba(255, 252, 245, 0.92)";for(const[a,o,r]of[[232,166,6.5],[364,294,5.5],[64,166,4.5],[432,178,5]])t.beginPath(),t.arc(a,o,r,0,Math.PI*2),t.fill();const s=new In(i);return s.colorSpace=qe,Dr=s,s}let Br=null;function Jh(){if(Br)return Br;const i=document.createElement("canvas");i.width=128,i.height=128;const t=i.getContext("2d");t.clearRect(0,0,128,128);const e=t.createRadialGradient(64,64,10,64,64,56);e.addColorStop(0,"rgba(52, 26, 10, 0.62)"),e.addColorStop(.62,"rgba(58, 30, 12, 0.46)"),e.addColorStop(.86,"rgba(68, 36, 14, 0.18)"),e.addColorStop(1,"rgba(68, 36, 14, 0)"),t.fillStyle=e,t.beginPath(),t.arc(64,64,58,0,Math.PI*2),t.fill();const n=new In(i);return Br=n,n}function te(i,t=.85){return i.roughness=Math.max(.24,Math.min(.48,i.roughness*.78)),i.metalness=Math.max(.14,i.metalness),i.needsUpdate=!0,i}class Ix{constructor(t){B(this,"state");this.state=t>>>0||123456789}next(){let t=this.state+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}range(t,e){return t+this.next()*(e-t)}int(t,e){return Math.floor(this.range(t,e+1))}pick(t){return t[Math.floor(this.next()*t.length)]}chance(t){return this.next()<t}}const Qh=["集团厂房总管 (STEAMWORKS DIRECTOR)","重锤锅炉督军 (BOILER FOREMAN)","双涡轮齿轮厂长 (TWIN-GEAR MAGNATE)","铁甲蒸汽巨匠 (IRONCLAD ENGINEER)","皇家发条大亨 (CLOCKWORK BARON)","黄铜礼帽董事长 (BRASS SYNDICATE CEO)","高压汽笛总督 (WHISTLE OVERSEER)","焦糖熔炉总管 (FURNACE WARDEN)","蒸汽广播主脑 (MEGAPHONE DIRECTOR)","红砖要塞总工程师 (CITADEL ARCHITECT)"],td=["工坊先锋 · 巨型扳手领班 (STAGE 5 MINI BOSS)","黑油主管 · 高压阀门督军 (STAGE 15 MINI BOSS)","齿轮处刑官 · 重装铆钉巨汉 (STAGE 25 MINI BOSS)","广播督察长 · 扩音蒸汽领主 (STAGE 35 MINI BOSS)","涡轮总领班 · 超压发条巨匠 (STAGE 45 MINI BOSS)"],ed=["集团董事 · 红砖巨型总厂长 (STAGE 10 MEGA BOSS)","蒸汽霸主 · 黄金齿轮大亨 (STAGE 20 MEGA BOSS)","熔炉总帅 · 百吨发条巨神 (STAGE 30 MEGA BOSS)","财团首脑 · 皇家蒸汽总督 (STAGE 40 MEGA BOSS)","终极厂长 · 无尽工坊最高总裁 (STAGE 50 MEGA BOSS)"],Bn=["副厂抓捕哨站","铆钉保安岗亭","高压油罐分站","厂区广播岗楼","发条巡逻车库","红砖警卫分厂","蒸汽补给站台"],Lx={cascade_scurve:{title:"三段蛇形 · 传送带街区",tag:"三段S弯+传送带",desc:"三层交错胡桃木弹簧挡板搭配侧翼加速传送带与弹球柱，借弯道分流冲向高倍横幅门！"},grinder_gauntlet:{title:"巡弋蒸汽炉 · 飞跃突围",tag:"移动锅炉+跳板",desc:"双巡弋高压蒸汽锅炉封锁中场，善用侧翼弹簧跳板飞跃挡板直取倍增门！"},twin_matrix:{title:"菱形广场 · 双翼回廊",tag:"菱形花坛+双翼",desc:"中央菱形木栏将石板桥一分为三，穿行内环应援舞台或借外环传送带包抄集团厂房！"},zigzag_fortress:{title:"五折工坊 · 动感滑门街区",tag:"折线木栏+滑门",desc:"多层弹簧木挡板与横向滑动闸门交替开合，把握滑门间隙切入金色倍增横幅！"},trilane_siege:{title:"三路分流 · 传送带与油污",tag:"三路异构工坊",desc:"左中右三路分别设有加速传送带、弹簧跳板与黏滞黑油污，因地制宜分兵破敌！"},chaos_overdrive:{title:"工坊弹球阵 · 嘉年华决战区",tag:"弹球柱+动态门",desc:"多座黄铜弹球柱与滑动木栏交织成热闹街区，撞击弹柱触发多路散射增殖！"},pinball_plaza:{title:"蒸汽弹球台 · 偏转漏斗",tag:"V型导流+弹球台",desc:"V型胡桃木导流板将波波团汇入五柱黄铜弹球台，自动弹射分流至两侧高倍黄金门！"},hourglass_choke:{title:"沙漏街口 · 飞跃天桥",tag:"沙漏街口+跳板",desc:"双向收窄的沙漏街口布满礼花炸药桶与油污，亦可走外侧跳板凌空飞跃街口！"},diamond_citadel:{title:"双菱花坛 · 交叉应援网",tag:"双菱迷宫+舞台",desc:"前后两座菱形木栏构筑四向分流街区，占领中心应援光环持续回血推进！"},conveyor_labyrinth:{title:"极速传送迷宫 · 动感回旋",tag:"双滑门+传送迷宫",desc:"双层滑动木闸配合长距加速传送带与黄铜弹柱，打造节奏多变的欢乐攻防战！"}};function Dx(i,t){const e=Math.max(1,Math.floor(i)),n=Math.floor(Date.now()%1e6)+e*9973+Math.floor(Math.random()*89999),s=new Ix(n),a=Math.pow(1.13,Math.min(e-1,35))+(e-1)*.16,o=Math.round((950+(e-1)*235)*Math.pow(1.135,Math.min(e-1,40))),r=Math.max(.42,Number((1.12*Math.pow(.955,Math.min(e-1,35))).toFixed(3))),l=Math.min(18,Math.round(4+(e-1)*.58)),c=Math.min(60,Math.round(11+(e-1)*3)),d=e===1?11.5:Math.max(4.4,Number((10.6*Math.pow(.935,Math.min(e-1,30))).toFixed(2))),u=Math.round(125*a),f=["cascade_scurve","grinder_gauntlet","twin_matrix","zigzag_fortress","trilane_siege","chaos_overdrive","pinball_plaza","hourglass_choke","diamond_citadel","conveyor_labyrinth"],m=s.pick(f),p=Lx[m],S=Qh[(e-1+s.int(0,2))%Qh.length],g=[],h=[],b=[],w=[],y=[],C=[],v=s.chance(.5)?-1:1,T=Math.min(20,Math.round(5+e*.8)),P=Math.round((110+(e-1)*24)*Math.pow(1.07,Math.min(e-1,25))),x=Math.round(75*a),M=Math.min(4,2+Math.floor((e-1)/4)),_=`s${e}_${n%1e3}`;if(m==="cascade_scurve"){const it=6.8*v,W=-6.4*v;g.push({id:`${_}_center_trap`,x:0,z:14.8,width:3.6,op:"sub",value:M,style:"hazard",moveRangeX:.65,moveSpeed:1.4,movePhase:0},{id:`${_}_lad_0`,x:it,z:12.6,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.2,moveSpeed:1.35},{id:`${_}_flank_0`,x:W,z:12.2,width:4.8,op:"add",value:s.int(2,3),style:"blue",moveRangeX:1.2,moveSpeed:1.4},{id:`${_}_lad_2`,x:it-.8*v,z:4.8,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:1.6,moveSpeed:1.45},{id:`${_}_sc_exit`,x:-2.6*v,z:-3.2,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:2.2,moveSpeed:1.5,movePhase:0},{id:`${_}_sc_haz2`,x:4.8*v,z:-3.2,width:3.4,op:"div",value:2,style:"hazard",moveRangeX:1.4,moveSpeed:1.5,movePhase:3.14},{id:`${_}_mega`,x:0,z:-8.8,width:5.2,op:"mul",value:3,style:"mega",moveRangeX:3.4,moveSpeed:1.6,movePhase:.4}),h.push({x1:4.8*v,z1:9.2,x2:-1.4*v,z2:6.4},{x1:-4.8*v,z1:3.8,x2:1.4*v,z2:1},{x1:4.4*v,z1:-1.6,x2:-1*v,z2:-4.4},{x1:-6.8*v,z1:8.8,x2:-6.8*v,z2:5.2}),y.push({id:`${_}_zb1`,type:"speed_belt",x:-6.2*v,z:8.5,width:2.8,length:5.5},{id:`${_}_zb2`,type:"speed_belt",x:6.2*v,z:2.2,width:2.8,length:5.5},{id:`${_}_zm1`,type:"toxic_mire",x:2.2*v,z:4.6,width:3.2,length:2.8}),C.push({id:`${_}_bmp1`,x:-2.4*v,z:6,radius:.85},{id:`${_}_bmp2`,x:2.4*v,z:.6,radius:.85}),b.push({id:`${_}_gear_1`,x:-7.2*v,z:-1.2,radius:1.85,hp:T,moveRangeX:1.4,moveSpeed:1.5}),w.push({id:`${_}_nest_1`,x:-7.8*v,z:-6.2,hp:P,name:s.pick(Bn),rewardGold:x})}else m==="grinder_gauntlet"?(g.push({id:`${_}_haz_entry`,x:0,z:13.4,width:3.6,op:"sub",value:M,style:"hazard",moveRangeX:.65,moveSpeed:1.4,movePhase:0},{id:`${_}_g1_l`,x:-6.2*v,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.5,moveSpeed:1.4,movePhase:.8},{id:`${_}_g1_r`,x:6.2*v,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.5,moveSpeed:1.4,movePhase:2.4},{id:`${_}_g2`,x:4.6*v,z:6.2,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:2.2,moveSpeed:1.55,movePhase:.5},{id:`${_}_g3`,x:-4.6*v,z:1.2,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:2.2,moveSpeed:1.5,movePhase:1.2},{id:`${_}_haz_mid`,x:4.8*v,z:-2.8,width:3.4,op:"sub",value:M,style:"hazard",moveRangeX:1.5,moveSpeed:1.6,movePhase:3.14},{id:`${_}_mega`,x:-1.5*v,z:-8.2,width:5.2,op:"mul",value:3,style:"mega",moveRangeX:3.2,moveSpeed:1.65,movePhase:0}),h.push({x1:0,z1:8.2,x2:0,z2:-1.8},{x1:-8.2*v,z1:7.4,x2:-4.8*v,z2:5.2},{x1:8.2*v,z1:4.2,x2:4.8*v,z2:2},{x1:-2.2,z1:-5.2,x2:2.2,z2:-5.2,moveRangeX:3.2,moveSpeed:1.35,movePhase:.5}),y.push({id:`${_}_jp1`,type:"jump_pad",x:-6.4*v,z:8.2,width:2.6,length:2.2},{id:`${_}_jp2`,type:"jump_pad",x:6.4*v,z:4.8,width:2.6,length:2.2},{id:`${_}_hs1`,type:"heal_sanctuary",x:-3.2*v,z:-4.2,width:3.4,length:3.2}),C.push({id:`${_}_bmp1`,x:0,z:9.4,radius:.9},{id:`${_}_bmp2`,x:-3.2*v,z:3.5,radius:.8}),b.push({id:`${_}_gr1`,x:5.4*v,z:2.2,radius:1.9,hp:T,moveRangeX:1.8,moveSpeed:1.45,movePhase:0},{id:`${_}_gr2`,x:-5.4*v,z:5.8,radius:1.9,hp:T,moveRangeX:1.8,moveSpeed:1.45,movePhase:3.14}),w.push({id:`${_}_nest_1`,x:7.2*v,z:-8.5,hp:P,name:s.pick(Bn),rewardGold:x})):m==="twin_matrix"?(g.push({id:`${_}_m0_trap`,x:0,z:13.4,width:3.6,op:"sub",value:M,style:"hazard",moveRangeX:.65,moveSpeed:1.4,movePhase:0},{id:`${_}_m1_l`,x:-6,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.6,moveSpeed:1.45,movePhase:0},{id:`${_}_m1_r`,x:6,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.6,moveSpeed:1.45,movePhase:3.14},{id:`${_}_m2_l`,x:-5.6,z:5.2,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.6,moveSpeed:1.5,movePhase:.7},{id:`${_}_m2_r`,x:5.6,z:5.2,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.6,moveSpeed:1.5,movePhase:2.3},{id:`${_}_m3_pos`,x:-3.2*v,z:-2.8,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:2.2,moveSpeed:1.6,movePhase:1.4},{id:`${_}_m3_haz`,x:4.5*v,z:-2.8,width:3.4,op:"div",value:2,style:"hazard",moveRangeX:1.6,moveSpeed:1.6,movePhase:4.5},{id:`${_}_m4`,x:0,z:-8.6,width:5.2,op:"mul",value:3,style:"mega",moveRangeX:3.6,moveSpeed:1.65,movePhase:.5}),h.push({x1:-1.4,z1:7.4,x2:-4.2,z2:3.2},{x1:1.4,z1:7.4,x2:4.2,z2:3.2},{x1:-4.2,z1:1.6,x2:-1.4,z2:-2.4},{x1:4.2,z1:1.6,x2:1.4,z2:-2.4}),y.push({id:`${_}_hs_core`,type:"heal_sanctuary",x:0,z:2.4,width:3.6,length:4.2},{id:`${_}_sb_l`,type:"speed_belt",x:-6.8,z:1.5,width:2.4,length:5.2},{id:`${_}_sb_r`,type:"speed_belt",x:6.8,z:1.5,width:2.4,length:5.2}),C.push({id:`${_}_bmp_top`,x:0,z:8.8,radius:.85},{id:`${_}_bmp_bot`,x:0,z:-4.2,radius:.85}),b.push({id:`${_}_gr_c`,x:0,z:6.2,radius:1.75,hp:T}),w.push({id:`${_}_nl`,x:-7.8*v,z:-5.5,hp:P,name:s.pick(Bn),rewardGold:x})):m==="zigzag_fortress"?(h.push({x1:-5.4*v,z1:9,x2:.8*v,z2:6.6},{x1:5.4*v,z1:4.4,x2:-.8*v,z2:2},{x1:-5.2*v,z1:-.4,x2:.8*v,z2:-2.8},{x1:-1.8,z1:-5.4,x2:1.8,z2:-5.4,moveRangeX:3.5,moveSpeed:1.5,movePhase:0}),g.push({id:`${_}_z_haz0`,x:0,z:13.4,width:3.6,op:"sub",value:M,style:"hazard",moveRangeX:.65,moveSpeed:1.4},{id:`${_}_z1`,x:-6.2*v,z:12.4,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.4,moveSpeed:1.4},{id:`${_}_z2`,x:6.2*v,z:12,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.6,moveSpeed:1.45},{id:`${_}_z3`,x:5.4*v,z:5.2,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:1.8,moveSpeed:1.5},{id:`${_}_z4`,x:-5.2*v,z:-2.2,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:1.8,moveSpeed:1.5},{id:`${_}_z_haz1`,x:4.5*v,z:-3.2,width:3.4,op:"sub",value:M,style:"hazard",moveRangeX:1.5,moveSpeed:1.6},{id:`${_}_mega`,x:0,z:-8.6,width:5.2,op:"mul",value:3,style:"mega",moveRangeX:3.4,moveSpeed:1.6,movePhase:0}),y.push({id:`${_}_jp_z1`,type:"jump_pad",x:-2.5*v,z:8.6,width:2.5,length:2.2},{id:`${_}_tm_z1`,type:"toxic_mire",x:2.5*v,z:1.2,width:3.4,length:2.8},{id:`${_}_sb_z1`,type:"speed_belt",x:-6.2*v,z:3,width:2.6,length:4.8}),C.push({id:`${_}_zbmp1`,x:2.6*v,z:6.2,radius:.85}),b.push({id:`${_}_zg1`,x:-7*v,z:4.2,radius:1.9,hp:T}),w.push({id:`${_}_zn1`,x:-7.6*v,z:-8.2,hp:P,name:s.pick(Bn),rewardGold:x})):m==="trilane_siege"?(h.push({x1:-3.6,z1:9.8,x2:-3.6,z2:4.2},{x1:-3.6,z1:1.8,x2:-3.6,z2:-3.8},{x1:3.6,z1:9.8,x2:3.6,z2:4.2},{x1:3.6,z1:1.8,x2:3.6,z2:-3.8},{x1:-2,z1:11.2,x2:-3.6,z2:9.8},{x1:2,z1:11.2,x2:3.6,z2:9.8}),y.push({id:`${_}_tl_sb`,type:"speed_belt",x:-6.4*v,z:2.5,width:3,length:9.5},{id:`${_}_tl_jp`,type:"jump_pad",x:0,z:7.2,width:3,length:2.4},{id:`${_}_tl_hs`,type:"heal_sanctuary",x:0,z:-1.5,width:3.4,length:3.4},{id:`${_}_tl_tm`,type:"toxic_mire",x:6.4*v,z:1.2,width:3.2,length:5.2}),C.push({id:`${_}_tl_b1`,x:-3.6,z:3,radius:.78},{id:`${_}_tl_b2`,x:3.6,z:3,radius:.78}),g.push({id:`${_}_tl_c1`,x:0,z:13.4,width:3.6,op:"sub",value:M,style:"hazard",moveRangeX:.65,moveSpeed:1.4},{id:`${_}_tl_c2`,x:0,z:3.2,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.4,moveSpeed:1.5},{id:`${_}_tl_l_0`,x:-6.8*v,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.2,moveSpeed:1.4},{id:`${_}_tl_l_1`,x:-6.8*v,z:4.5,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.2,moveSpeed:1.45},{id:`${_}_tl_r1`,x:6.8*v,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.2,moveSpeed:1.4,movePhase:0},{id:`${_}_tl_r2`,x:6.8*v,z:4.5,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.2,moveSpeed:1.45,movePhase:2.2},{id:`${_}_tl_mega`,x:-1.8*v,z:-8.4,width:5.2,op:"mul",value:3,style:"mega",moveRangeX:3.2,moveSpeed:1.6,movePhase:0},{id:`${_}_tl_fhaz`,x:5*v,z:-3.2,width:3.4,op:"div",value:2,style:"hazard",moveRangeX:1.4,moveSpeed:1.55,movePhase:3.14}),b.push({id:`${_}_tl_gc`,x:0,z:9.6,radius:1.75,hp:T}),w.push({id:`${_}_tl_nest`,x:7.5*v,z:-4.8,hp:P,name:s.pick(Bn),rewardGold:x})):m==="pinball_plaza"?(h.push({x1:-8.4,z1:9.6,x2:-3.2,z2:5.8},{x1:8.4,z1:9.6,x2:3.2,z2:5.8},{x1:-2.6,z1:-1.8,x2:-6.2,z2:-5.4},{x1:2.6,z1:-1.8,x2:6.2,z2:-5.4}),C.push({id:`${_}_pb1`,x:0,z:5.2,radius:.95},{id:`${_}_pb2`,x:-2.6,z:2.6,radius:.9},{id:`${_}_pb3`,x:2.6,z:2.6,radius:.9},{id:`${_}_pb4`,x:-4.6,z:-.2,radius:.85},{id:`${_}_pb5`,x:4.6,z:-.2,radius:.85}),y.push({id:`${_}_pb_sb1`,type:"speed_belt",x:-6.8,z:1.8,width:2.5,length:6},{id:`${_}_pb_sb2`,type:"speed_belt",x:6.8,z:1.8,width:2.5,length:6},{id:`${_}_pb_hs`,type:"heal_sanctuary",x:0,z:-.2,width:3.6,length:3.2}),g.push({id:`${_}_pb_haz0`,x:0,z:13.4,width:3.4,op:"sub",value:M,style:"hazard",moveRangeX:.8,moveSpeed:1.4},{id:`${_}_pb_l1`,x:-5.8,z:12.2,width:4.8,op:"add",value:3,style:"blue",moveRangeX:1.4,moveSpeed:1.4},{id:`${_}_pb_r1`,x:5.8,z:12.2,width:4.8,op:"add",value:3,style:"blue",moveRangeX:1.4,moveSpeed:1.4},{id:`${_}_pb_l2`,x:-6,z:-2.4,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.5,moveSpeed:1.5},{id:`${_}_pb_r2`,x:6,z:-2.4,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.5,moveSpeed:1.5},{id:`${_}_pb_mega`,x:0,z:-8.6,width:5.4,op:"mul",value:3,style:"mega",moveRangeX:3.4,moveSpeed:1.65}),w.push({id:`${_}_pb_nest`,x:7.6*v,z:-7.5,hp:P,name:s.pick(Bn),rewardGold:x})):m==="hourglass_choke"?(h.push({x1:-8.2,z1:8.8,x2:-2.5,z2:3.2},{x1:8.2,z1:8.8,x2:2.5,z2:3.2},{x1:-2.5,z1:.4,x2:-7.8,z2:-4.8},{x1:2.5,z1:.4,x2:7.8,z2:-4.8}),y.push({id:`${_}_hg_tm`,type:"toxic_mire",x:0,z:1.8,width:3.8,length:3.6},{id:`${_}_hg_jp1`,type:"jump_pad",x:-6.2,z:6.8,width:2.8,length:2.4},{id:`${_}_hg_jp2`,type:"jump_pad",x:6.2,z:6.8,width:2.8,length:2.4},{id:`${_}_hg_sb`,type:"speed_belt",x:0,z:-4.2,width:3.2,length:5}),C.push({id:`${_}_hg_b1`,x:-3.6,z:-2.2,radius:.85},{id:`${_}_hg_b2`,x:3.6,z:-2.2,radius:.85}),g.push({id:`${_}_hg_haz0`,x:0,z:13.4,width:3.6,op:"sub",value:M,style:"hazard",moveRangeX:.7,moveSpeed:1.4},{id:`${_}_hg_l1`,x:-6.2,z:12,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.4,moveSpeed:1.4},{id:`${_}_hg_r1`,x:6.2,z:12,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.4,moveSpeed:1.4},{id:`${_}_hg_mid`,x:0,z:4.6,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.2,moveSpeed:1.45},{id:`${_}_hg_l2`,x:-5.4*v,z:-2.6,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.6,moveSpeed:1.55},{id:`${_}_hg_mega`,x:0,z:-8.6,width:5.2,op:"mul",value:3,style:"mega",moveRangeX:3.2,moveSpeed:1.6}),b.push({id:`${_}_hg_g1`,x:5.6*v,z:1.8,radius:1.85,hp:T}),w.push({id:`${_}_hg_n1`,x:-7.5*v,z:-7.2,hp:P,name:s.pick(Bn),rewardGold:x})):m==="diamond_citadel"?(h.push({x1:-3*v,z1:9,x2:-5.6*v,z2:6.2},{x1:-3*v,z1:9,x2:-.4*v,z2:6.2},{x1:-5.6*v,z1:5.4,x2:-3*v,z2:2.8},{x1:-.4*v,z1:5.4,x2:-3*v,z2:2.8},{x1:3*v,z1:1.6,x2:.4*v,z2:-1.2},{x1:3*v,z1:1.6,x2:5.6*v,z2:-1.2},{x1:.4*v,z1:-2,x2:3*v,z2:-4.6},{x1:5.6*v,z1:-2,x2:3*v,z2:-4.6}),y.push({id:`${_}_dc_sb1`,type:"speed_belt",x:4.8*v,z:6,width:2.8,length:5.6},{id:`${_}_dc_sb2`,type:"speed_belt",x:-4.8*v,z:-1.4,width:2.8,length:5.6},{id:`${_}_dc_hs`,type:"heal_sanctuary",x:0,z:2.2,width:3.4,length:3}),C.push({id:`${_}_dc_b1`,x:0,z:9.2,radius:.85},{id:`${_}_dc_b2`,x:0,z:-4.8,radius:.85}),g.push({id:`${_}_dc_haz0`,x:0,z:13.4,width:3.5,op:"sub",value:M,style:"hazard",moveRangeX:.65,moveSpeed:1.4},{id:`${_}_dc_l1`,x:-6.2,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.4,moveSpeed:1.4},{id:`${_}_dc_r1`,x:6.2,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.4,moveSpeed:1.4},{id:`${_}_dc_g1`,x:4.8*v,z:5.8,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.5,moveSpeed:1.5},{id:`${_}_dc_g2`,x:-4.8*v,z:-1.6,width:4.6,op:"mul",value:2,style:"gold",moveRangeX:1.5,moveSpeed:1.5},{id:`${_}_dc_mega`,x:0,z:-8.6,width:5.2,op:"mul",value:3,style:"mega",moveRangeX:3.4,moveSpeed:1.65}),w.push({id:`${_}_dc_n1`,x:7.6*v,z:-7,hp:P,name:s.pick(Bn),rewardGold:x})):m==="conveyor_labyrinth"?(h.push({x1:-2.4,z1:7.6,x2:2.4,z2:7.6,moveRangeX:3.8,moveSpeed:1.45,movePhase:0},{x1:-2.4,z1:.6,x2:2.4,z2:.6,moveRangeX:3.8,moveSpeed:1.45,movePhase:3.14},{x1:-6.8*v,z1:4.8,x2:-2.8*v,z2:2.8},{x1:6.8*v,z1:-2.2,x2:2.8*v,z2:-4.2}),y.push({id:`${_}_cl_sb1`,type:"speed_belt",x:-5.8*v,z:8.8,width:2.8,length:4.8},{id:`${_}_cl_sb2`,type:"speed_belt",x:5.8*v,z:3.6,width:2.8,length:5.2},{id:`${_}_cl_jp1`,type:"jump_pad",x:0,z:9.4,width:2.8,length:2.2},{id:`${_}_cl_tm1`,type:"toxic_mire",x:-4.6*v,z:-2.6,width:3.4,length:3.2}),C.push({id:`${_}_cl_b1`,x:2.4*v,z:4.2,radius:.85},{id:`${_}_cl_b2`,x:-2.4*v,z:-2.8,radius:.85}),g.push({id:`${_}_cl_haz0`,x:0,z:13.4,width:3.5,op:"sub",value:M,style:"hazard",moveRangeX:.7,moveSpeed:1.4},{id:`${_}_cl_l1`,x:-6.2,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.5,moveSpeed:1.4},{id:`${_}_cl_r1`,x:6.2,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.5,moveSpeed:1.4},{id:`${_}_cl_g1`,x:5.4*v,z:4.8,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:1.8,moveSpeed:1.5},{id:`${_}_cl_g2`,x:-5.4*v,z:-1.8,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:1.8,moveSpeed:1.5},{id:`${_}_cl_mega`,x:0,z:-8.6,width:5.2,op:"mul",value:3,style:"mega",moveRangeX:3.4,moveSpeed:1.65}),b.push({id:`${_}_cl_gr1`,x:0,z:-4.2,radius:1.85,hp:T,moveRangeX:2.2,moveSpeed:1.5}),w.push({id:`${_}_cl_n1`,x:-7.6*v,z:-6.8,hp:P,name:s.pick(Bn),rewardGold:x})):(g.push({id:`${_}_co_haz0`,x:0,z:13.4,width:3.6,op:"sub",value:M,style:"hazard",moveRangeX:.65,moveSpeed:1.4,movePhase:0},{id:`${_}_co_l_0`,x:-6.4*v,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.5,moveSpeed:1.4},{id:`${_}_co_r_0`,x:6.4*v,z:12.2,width:4.8,op:"add",value:2,style:"blue",moveRangeX:1.5,moveSpeed:1.4},{id:`${_}_co_l_1`,x:-5.8*v,z:5.4,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:1.8,moveSpeed:1.5},{id:`${_}_co_c2`,x:3.6*v,z:2.2,width:4.8,op:"mul",value:2,style:"gold",moveRangeX:2.4,moveSpeed:1.55,movePhase:1.2},{id:`${_}_co_haz2`,x:-4.5*v,z:-2.6,width:3.4,op:"div",value:2,style:"hazard",moveRangeX:1.5,moveSpeed:1.55,movePhase:4.3},{id:`${_}_co_mega`,x:0,z:-8.4,width:5.2,op:"mul",value:3,style:"mega",moveRangeX:3.6,moveSpeed:1.65,movePhase:0}),h.push({x1:-4.2*v,z1:8.6,x2:-1.8*v,z2:3.2},{x1:4.2*v,z1:6.2,x2:1.8*v,z2:.8},{x1:-2.8*v,z1:-.8,x2:1.2*v,z2:-3.6},{x1:-2,z1:-5.5,x2:2,z2:-5.5,moveRangeX:3.2,moveSpeed:1.55,movePhase:1}),y.push({id:`${_}_co_sb`,type:"speed_belt",x:6.4*v,z:7.2,width:2.6,length:5},{id:`${_}_co_jp`,type:"jump_pad",x:-6.2*v,z:2.2,width:2.6,length:2.2},{id:`${_}_co_hs`,type:"heal_sanctuary",x:0,z:4.8,width:3.2,length:3}),C.push({id:`${_}_co_b1`,x:0,z:8.2,radius:.88},{id:`${_}_co_b2`,x:-2.8*v,z:1,radius:.85},{id:`${_}_co_b3`,x:3.2*v,z:-2.2,radius:.85}),b.push({id:`${_}_co_g1`,x:6.2*v,z:-2.4,radius:1.9,hp:T,moveRangeX:1.6,moveSpeed:1.4}),w.push({id:`${_}_co_n1`,x:7.8*v,z:-6.8,hp:P,name:s.pick(Bn),rewardGold:x}));const N=Ca[(e-1)%Ca.length],U=e%10===0,H=e%10===5,z=U||H||e%4===0,L=U?Math.round(u*2.5):H?Math.round(u*1.85):z?Math.round(u*1.65):u,A=U?ed[(Math.floor(e/10)-1)%ed.length]:H?td[Math.floor((e-5)/10)%td.length]:S,E=[],I=[[-3.2*v,2.2],[3.4*v,-.8],[-4.8*v,-4.2],[4.8*v,-4.2],[0,1.2],[-2.6*v,-3.4],[2.6*v,3.8],[-5.6*v,.8],[5.6*v,.8],[0,-6.8]],V=(it,W)=>{for(const j of h){const ht=(j.moveRangeX||0)+1.15,dt=Math.min(j.x1,j.x2)-ht,Rt=Math.max(j.x1,j.x2)+ht,Pt=Math.min(j.z1,j.z2)-1.15,kt=Math.max(j.z1,j.z2)+1.15;if(it>=dt&&it<=Rt&&W>=Pt&&W<=kt)return!1}for(const j of b){const ht=(j.moveRangeX||0)+j.radius+1.2;if(Math.abs(it-j.x)<ht&&Math.abs(W-j.z)<j.radius+1.2)return!1}for(const j of g)if(Math.abs(W-j.z)<1.35&&Math.abs(it-j.x)<j.width*.5+(j.moveRangeX||0)+.9)return!1;for(const j of C)if(Math.hypot(it-j.x,W-j.z)<j.radius+1.35)return!1;for(const j of E)if(Math.hypot(it-j.x,W-j.z)<2.6)return!1;return!0},$=z?4:s.int(2,3),Q=Math.min(8,3+Math.floor(e/4));for(const[it,W]of I){if(E.length>=$)break;const j=it+s.range(-.35,.35),ht=W+s.range(-.3,.3);V(j,ht)&&E.push({id:`${_}_barrel_${E.length}`,x:Number(j.toFixed(2)),z:Number(ht.toFixed(2)),hp:Q})}return{id:e,seed:n,themeId:N,archetype:m,archetypeName:U?`👑十关机制大Boss · ${p.tag}`:H?`👹五关先锋小Boss · ${p.tag}`:z?`⚡超频决战 · ${p.tag}`:p.tag,isMilestoneBoss:z,isMiniBoss:H,isMegaBoss:U,name:U?`第 ${e} 关：👑 ${A}`:H?`第 ${e} 关：👹 ${A}`:`第 ${e} 关：${p.title}`,subtitle:`[随机地形 #${n%1e4}] ${p.desc}`,bossName:A,bossMaxHp:U?Math.round(o*1.9):H?Math.round(o*1.42):z?Math.round(o*1.2):o,enemySpawnInterval:U?Number(Math.max(.36,r*.82).toFixed(3)):H?Number(Math.max(.38,r*.9).toFixed(3)):r,enemyBurstCount:U?Math.min(22,l+3):H?Math.min(20,l+2):l,initialRedPrewarm:c,bruteSpawnInterval:d,rewardGold:L,gates:g,walls:h,gears:b,nests:w,barrels:E,zones:y,bumpers:C}}const Se=i=>`<img class="art-icon-img skill-art-img" src="/assets/icons/${i}.png?v=15" alt="" loading="eager" decoding="async" draggable="false" />`,Vi=(i,t="race-art-img")=>`<img class="art-icon-img ${t}" src="/assets/icons/race_${i}.png?v=15" alt="" loading="eager" decoding="async" draggable="false" />`,Es=i=>`<img class="art-icon-img meta-art-img" src="/assets/icons/${i}.png?v=15" alt="" loading="eager" decoding="async" draggable="false" />`,Ot=(i,t="hud-art-img")=>`<img class="art-icon-img ${t}" src="/assets/icons/${i}.png?v=15" alt="" loading="eager" decoding="async" draggable="false" />`,xe={swarm_t1:Se("swarm_t1"),swarm_t2:Se("swarm_t2"),swarm_t3:Se("swarm_t3"),swarm_t4:Se("swarm_t4"),titan_t1:Se("titan_t1"),titan_t2:Se("titan_t2"),titan_t3:Se("titan_t3"),titan_t4:Se("titan_t4"),gate_t1:Se("gate_t1"),gate_t2:Se("gate_t2"),gate_t3:Se("gate_t3"),gate_t4:Se("gate_t4"),plasma_t1:Se("plasma_t1"),plasma_t2:Se("plasma_t2"),plasma_t3:Se("plasma_t3"),plasma_t4:Se("plasma_t4"),orbital_t1:Se("orbital_t1"),orbital_t2:Se("orbital_t2"),orbital_t3:Se("orbital_t3"),orbital_t4:Se("orbital_t4"),bastion_t1:Se("bastion_t1"),bastion_t2:Se("bastion_t2"),bastion_t3:Se("bastion_t3"),bastion_t4:Se("bastion_t4"),tycoon_t1:Se("tycoon_t1"),tycoon_t2:Se("tycoon_t2"),tycoon_t3:Se("tycoon_t3"),tycoon_t4:Se("tycoon_t4")},xn={swarm:Vi("swarm"),titan:Vi("titan"),gate:Vi("gate"),plasma:Vi("plasma"),orbital:Vi("orbital"),bastion:Vi("bastion"),tycoon:Vi("tycoon")},Cs={meta_attack:Es("meta_attack"),meta_firerate:Es("meta_firerate"),meta_bastion:Es("meta_bastion"),meta_capacitor:Es("meta_capacitor"),meta_thruster:Es("meta_thruster"),meta_bounty:Es("meta_bounty")},Nr={hammer:Ot("hud_hammer"),pyro:Ot("hud_pyro"),aegis:Ot("hud_aegis")},Nn={rapid_fire:Ot("meta_firerate","reward-art-img"),hyper_gene:Ot("meta_attack","reward-art-img"),bastion_aegis:Ot("meta_bastion","reward-art-img"),nitro_stride:Ot("meta_thruster","reward-art-img"),siege_breaker:Ot("titan_t1","reward-art-img"),titan_reactor:Ot("meta_capacitor","reward-art-img"),plasma_crit:Ot("tycoon_t1","reward-art-img"),split_chamber:Ot("hud_pyro","reward-art-img"),war_plunder:Ot("meta_bounty","reward-art-img"),gate_resonance:Ot("gate_t1","reward-art-img")},Bx={azure:Ot("skin_azure","skin-art-img"),crimson:Ot("skin_crimson","skin-art-img"),emerald:Ot("skin_emerald","skin-art-img"),phantom:Ot("skin_phantom","skin-art-img"),imperium:Ot("skin_imperium","skin-art-img"),nebula:Ot("skin_nebula","skin-art-img")},Z={trophy:Ot("ui_trophy","inline-art-img"),barrel:Ot("ui_barrel","inline-art-img"),lootbug:Ot("ui_lootbug","inline-art-img"),gift:Ot("ui_gift","inline-art-img"),pyro:Ot("hud_pyro","inline-art-img"),star:Ot("ui_star","inline-art-img"),coin:Ot("ui_coin","inline-art-img"),crown:Ot("ui_crown","inline-art-img"),lock:Ot("ui_lock","inline-art-img"),check:Ot("ui_check","inline-art-img"),arrowUp:Ot("ui_arrow_up","inline-art-img"),refresh:Ot("ui_refresh","inline-art-img"),dice:Ot("ui_dice","inline-art-img"),palette:Ot("ui_palette","inline-art-img"),camera:Ot("ui_camera","inline-art-img"),soundOn:Ot("ui_sound_on","inline-art-img"),soundOff:Ot("ui_sound_off","inline-art-img"),home:Ot("ui_home","inline-art-img"),play:Ot("ui_play","inline-art-img"),rocket:Ot("ui_rocket","inline-art-img"),medal1:Ot("ui_medal1","inline-art-img"),medal2:Ot("ui_medal2","inline-art-img"),medal3:Ot("ui_medal3","inline-art-img"),clock:Ot("ui_clock","inline-art-img"),edit:Ot("ui_edit","inline-art-img"),share:Ot("ui_share","inline-art-img"),shard:Ot("ui_shard","inline-art-img"),sparkle:Ot("ui_sparkle","inline-art-img"),warning:Ot("ui_warning","inline-art-img"),flame:Ot("ui_flame","inline-art-img"),sword:Ot("ui_sword","inline-art-img"),shield:Ot("ui_shield","inline-art-img"),bolt:Ot("ui_bolt","inline-art-img"),oil:Ot("ui_barrel","inline-art-img"),belt:Ot("meta_thruster","inline-art-img"),spring:Ot("meta_capacitor","inline-art-img"),heart:Ot("ui_heart","inline-art-img"),brokenHeart:Ot("ui_broken_heart","inline-art-img"),gear:Ot("ui_gear","inline-art-img"),note:Ot("hud_music_note","inline-art-img"),megaphone:Ot("ui_megaphone","inline-art-img"),boom:Ot("ui_boom","inline-art-img")},fa={barrel_overheat:Z.flame,gene_instability:Z.warning,shield_fracture:Z.brokenHeart,reactor_leak:Z.soundOff,cryo_sludge:Z.oil},Nx=[["👑",Z.crown],["🏆",Z.trophy],["🎁",Z.gift],["🧨",Z.barrel],["💰",Z.lootbug],["🪙",Z.coin],["⭐",Z.star],["🌟",Z.star],["★",Z.star],["🔒",Z.lock],["✅",Z.check],["✔",Z.check],["⬆️",Z.arrowUp],["🔄",Z.refresh],["🎲",Z.dice],["🎨",Z.palette],["🎥",Z.camera],["🔊",Z.soundOn],["🔇",Z.soundOff],["🏠",Z.home],["▶️",Z.play],["🚀",Z.rocket],["🥇",Z.medal1],["🥈",Z.medal2],["🥉",Z.medal3],["⏱️",Z.clock],["⏳",Z.clock],["✏️",Z.edit],["📤",Z.share],["🧩",Z.shard],["✨",Z.sparkle],["🎉",Z.sparkle],["🎊",Z.sparkle],["⚠️",Z.warning],["🔥",Z.flame],["⚔️",Z.sword],["🛡️",Z.shield],["🏰",Z.shield],["⚡",Z.bolt],["🛢️",Z.oil],["⏩",Z.belt],["💖",Z.heart],["💔",Z.brokenHeart],["💸",Z.coin],["⚙️",Z.gear],["🛠️",Z.gear],["🎵",Z.note],["🎶",Z.note],["🎆",Z.pyro],["📢",Z.megaphone],["💥",Z.boom],["☄️",Z.flame],["👹",Z.warning],["🌊",Z.sparkle],["🗿",Z.shield],["🎯",Z.star],["🫧",xn.swarm],["💧",xn.swarm],["🍮",xn.titan],["🎀",xn.gate],["🍪",xn.bastion]];function Do(i){let t=i;for(const[e,n]of Nx)t.includes(e)&&(t=t.split(e).join(n));return t}const za=[{id:"meta_attack",icon:Cs.meta_attack,name:"全军攻击",desc:"波波团与领队基础伤害",baseCost:180,costMult:1.52,maxLevel:20,statPerLevelText:i=>`当前 +${i*3}% (每级+3%)`},{id:"meta_firerate",icon:Cs.meta_firerate,name:"基础射速",desc:"波波蒸汽炮基础射速",baseCost:200,costMult:1.52,maxLevel:20,statPerLevelText:i=>`当前 +${(i*2.5).toFixed(1).replace(/\.0$/,"")}% (每级+2.5%)`},{id:"meta_bastion",icon:Cs.meta_bastion,name:"基地生命",desc:"我方泡泡站最大生命",baseCost:160,costMult:1.48,maxLevel:20,statPerLevelText:i=>`当前 +${i*5}% (每级+5%)`},{id:"meta_capacitor",icon:Cs.meta_capacitor,name:"初始充能",desc:"双大招开局初始能量",baseCost:220,costMult:1.58,maxLevel:8,statPerLevelText:i=>`当前 +${i*3}% (每级+3%)`},{id:"meta_thruster",icon:Cs.meta_thruster,name:"行军移速",desc:"波波兵冲锋推进移速",baseCost:180,costMult:1.52,maxLevel:10,statPerLevelText:i=>`当前 +${i*2}% (每级+2%)`},{id:"meta_bounty",icon:Cs.meta_bounty,name:"金币加成",desc:"击败敌人与通关金币收益",baseCost:200,costMult:1.52,maxLevel:20,statPerLevelText:i=>`当前 +${i*4}% (每级+4%)`}],ze=[{index:0,tier:"C",title:"C阶·制式",shardsToNext:100,goldToNext:8e3,bonusMult:1,color:"#cbd5e1",bg:"rgba(51, 65, 85, 0.85)"},{index:1,tier:"B",title:"B阶·精良",shardsToNext:220,goldToNext:2e4,bonusMult:1.35,color:"#38bdf8",bg:"rgba(14, 116, 144, 0.85)"},{index:2,tier:"A",title:"A阶·稀有",shardsToNext:400,goldToNext:45e3,bonusMult:1.75,color:"#c084fc",bg:"rgba(107, 33, 168, 0.85)"},{index:3,tier:"S",title:"S阶·史诗",shardsToNext:700,goldToNext:95e3,bonusMult:2.25,color:"#facc15",bg:"rgba(161, 98, 7, 0.88)"},{index:4,tier:"SS",title:"SS阶·传说",shardsToNext:1100,goldToNext:2e5,bonusMult:2.9,color:"#fb923c",bg:"rgba(194, 65, 12, 0.9)"},{index:5,tier:"SSS",title:"SSS阶·神话",shardsToNext:0,goldToNext:0,bonusMult:3.8,color:"#f472b6",bg:"linear-gradient(135deg, #db2777, #ca8a04)"}],Un=[{id:"azure",name:"海盐汽水糖",tag:"经典",desc:"天蓝、青柠绿与珊瑚粉缤纷三色果冻波波团 + 象牙黄铜蒸汽炮",statLabel:"泡泡站生命",statValueAtRank:i=>{var e;return`+${(1.5*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},bonusText:"泡泡站生命 +1.5%",bonusTextAtRank:i=>{var e;return`泡泡站生命 +${(1.5*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},cost:0,ascendGoldMult:1,previewGradient:"linear-gradient(135deg, #25c4f8, #7ce838, #fb6d7f)",badgeColor:"#25c4f8",palette:{primary:2475256,secondary:1221851,dark:2896704,accent:6806783,glow:16743110,emissive:664886}},{id:"crimson",name:"草莓甜心冻",tag:"人气",desc:"蜜桃粉与草莓红Q弹糖果波波团 + 蜜金黄铜蒸汽炮",statLabel:"全军战力",statValueAtRank:i=>{var e;return`+${(2*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},bonusText:"全军战力 +2%",bonusTextAtRank:i=>{var e;return`全军战力 +${(2*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},cost:5e3,ascendGoldMult:1.2,previewGradient:"linear-gradient(135deg, #fb6d7f, #ffb3c1)",badgeColor:"#fb6d7f",palette:{primary:16477567,secondary:15093091,dark:3875369,accent:16754358,glow:16769126,emissive:3674650}},{id:"emerald",name:"青苹果软糖",tag:"史诗",desc:"鲜嫩青柠与薄荷苹果果冻波波团 + 翡翠黄铜蒸汽炮",statLabel:"发射射速",statValueAtRank:i=>{var e;return`+${(2*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},bonusText:"发射射速 +2%",bonusTextAtRank:i=>{var e;return`发射射速 +${(2*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},cost:12e3,ascendGoldMult:1.5,previewGradient:"linear-gradient(135deg, #56d334, #a8f25a)",badgeColor:"#58b938",palette:{primary:8185912,secondary:5423652,dark:2242076,accent:11466600,glow:16773244,emissive:1454862}},{id:"phantom",name:"葡萄星梦冻",tag:"史诗",desc:"薰衣草紫与香芋牛奶果冻波波团 + 星光偶像荧光棒",statLabel:"演出充能",statValueAtRank:i=>{var e;return`+${(4*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},bonusText:"演出充能 +4%",bonusTextAtRank:i=>{var e;return`演出充能 +${(4*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},cost:25e3,ascendGoldMult:1.8,previewGradient:"linear-gradient(135deg, #a86cf5, #f472b6)",badgeColor:"#a86cf5",palette:{primary:11037941,secondary:8932576,dark:2759997,accent:13936127,glow:16745944,emissive:2495040}},{id:"imperium",name:"皇家焦糖布丁",tag:"传说",desc:"黄金奶油布丁波波团 + 皇家纯金雕花蒸汽礼炮",statLabel:"赏金收益",statValueAtRank:i=>{var e;return`+${(5*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},bonusText:"赏金收益 +5%",bonusTextAtRank:i=>{var e;return`赏金收益 +${(5*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},cost:5e4,ascendGoldMult:2.2,previewGradient:"linear-gradient(135deg, #f5b627, #ffe680)",badgeColor:"#d99016",palette:{primary:16234289,secondary:14258966,dark:3877394,accent:16769658,glow:16777215,emissive:4336394}},{id:"nebula",name:"梦幻偶像舞台",tag:"神话",desc:"樱花粉与苏打蓝渐变应援波波团 + 闪耀演唱会主炮",statLabel:"战力与射速",statValueAtRank:i=>{var e;return`+${(4*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},bonusText:"战力与射速 +4%",bonusTextAtRank:i=>{var e;return`战力与射速 +${(4*(((e=ze[i])==null?void 0:e.bonusMult)||1)).toFixed(1).replace(/\.0$/,"")}%`},cost:1e5,ascendGoldMult:3,previewGradient:"linear-gradient(135deg, #ff6fa8, #35d0ff)",badgeColor:"#ee5c9c",palette:{primary:16740264,secondary:2475256,dark:3022648,accent:7135487,glow:16773258,emissive:3805224}}],Ur={hammer:{id:"hammer",icon:Nr.hammer,name:"重锤跃击",shortName:"重锤",desc:"领队跃击震波+重甲破防180%",bannerDesc:"重锤跃击震飞 · 对重甲与首领造成180%暴击"},pyro:{id:"pyro",icon:Nr.pyro,name:"礼花清场",shortName:"礼花",desc:"前方扇形星光礼花清场",bannerDesc:"星光礼花连射 · 瞬间清扫前排密集敌群"},aegis:{id:"aegis",icon:Nr.aegis,name:"护盾光环",shortName:"护盾",desc:"群体护盾+友军减伤回血光环",bannerDesc:"守护光环展开 · 周围波波兵减伤50%并持续回血"}},zr=["hammer","pyro","aegis"],Re=[{id:"swarm",icon:xn.swarm,name:"波波族·分裂流",raceName:"波波族",unitName:"水滴波波",heroName:"波波领队",modelDesc:"纯白头带 · 双持荧光棒",subtitle:"极速分裂 · 退场自爆 · 基地孵兵",accentColor:"#25c4f8",hammerMorphName:"重锤召唤",hammerMorphDesc:"跃击震地召唤波波小队，领队退场分裂多只水滴波波",orbitalMorphName:"波波空投",orbitalMorphDesc:"礼花光柱化为空投舱，按进阶级数空降大批波波兵",nodes:[{id:"swarm_t1",branchId:"swarm",tier:1,icon:xe.swarm_t1,name:"双联速射",desc:"基础兵化为灵巧水滴波波(移速+10%)，射速与双联齐射率大幅提升",maxRank:3,pointCost:1,statText:i=>`射速+${i*12}% · 齐射率+${i*32}% · 波波移速+10%`},{id:"swarm_t2",branchId:"swarm",tier:2,icon:xe.swarm_t2,name:"集群加速",desc:"场上波波数量越多移速与攻速越快；穿过蓝门有概率额外分裂+1只波波",maxRank:3,pointCost:1,prereq:"swarm_t1",statText:i=>`每15只+${i*2}%移速 · 过门${i*15}%额外+1兵`},{id:"swarm_t3",branchId:"swarm",tier:3,icon:xe.swarm_t3,name:"退场自爆",desc:"波波兵与领队退场时炸开泡泡，对周围敌人造成范围伤害",maxRank:3,pointCost:2,prereq:"swarm_t2",statText:i=>`退场范围伤 ${28+i*22}% · 领队分裂${4+i*2}兵`},{id:"swarm_t4",branchId:"swarm",tier:4,icon:xe.swarm_t4,name:"三联分裂",desc:"常驻双/三联齐射，近战击败18%分裂新波波，泡泡站每6.5s自动孵出波波群，解锁【完全体大招】",maxRank:1,pointCost:4,prereq:"swarm_t3",isKeystone:!0,statText:i=>i>0?"三联齐射 + 击败18%分裂 + 自动孵兵 + 完全体大招":"效果：三联齐射 + 击败分裂 + 自动孵兵 + 完全体大招"}]},{id:"titan",icon:xn.titan,name:"布丁族·合体流",raceName:"布丁族",unitName:"巨型布丁",heroName:"布丁大王",modelDesc:"焦糖皇冠 · 华夫大木槌",subtitle:"巨化重装 · 范围顺劈 · 吞噬合体",accentColor:"#e87e24",hammerMorphName:"震地合体",hammerMorphDesc:"连环震地破防，震波令周围友军布丁合体升阶",orbitalMorphName:"巨型空降",orbitalMorphDesc:"空投合体大布丁，并令场上友军布丁升阶进化",nodes:[{id:"titan_t1",branchId:"titan",tier:1,icon:xe.titan_t1,name:"巨化合体",desc:"基础波波巨化且同阶可两两合体！射速降低，单体血量与攻击显著提升",maxRank:3,pointCost:1,statText:i=>`射速-${i===1?45:i===2?52:58}% · 体型×${(1.38+i*.12).toFixed(2)} · 血×${(1.55+i*.35).toFixed(2)} 攻×${(1.4+i*.25).toFixed(2)}`},{id:"titan_t2",branchId:"titan",tier:2,icon:xe.titan_t2,name:"三阶进化",desc:"开放三阶布丁合体上限，每次两两合体获得额外属性增幅",maxRank:3,pointCost:1,prereq:"titan_t1",statText:i=>`开放3阶大布丁 · 合体属性额外+${i*8}%`},{id:"titan_t3",branchId:"titan",tier:3,icon:xe.titan_t3,name:"重击顺劈",desc:"大布丁普攻附加范围顺劈与减伤；释放大招可令友军布丁升阶",maxRank:3,pointCost:2,prereq:"titan_t2",statText:i=>`顺劈${10+i*8}%范围伤 · 减伤+${i*5}% · 技能促合体`},{id:"titan_t4",branchId:"titan",tier:4,icon:xe.titan_t4,name:"四阶觉醒",desc:"蒸汽炮25%概率直出二阶布丁，开放四阶合体上限，双领队同场，解锁【完全体大招】",maxRank:1,pointCost:4,prereq:"titan_t3",isKeystone:!0,statText:i=>i>0?"25%直出2阶 + 4阶合体 + 双领队 + 完全体大招":"效果：25%直出2阶 + 4阶合体 + 双领队 + 完全体大招"}]},{id:"gate",icon:xn.gate,name:"兔耳族·倍增流",raceName:"兔耳族",unitName:"兔耳波波",heroName:"兔耳领队",modelDesc:"萌系长兔耳 · 星光魔法棒",subtitle:"蓝门升7阶 · 横幅自喷兵 · 红门翻蓝",accentColor:"#ec609e",hammerMorphName:"横幅升阶",hammerMorphDesc:"跃击升级全图蓝门、将红门翻转为蓝门并喷涌波波兵",orbitalMorphName:"红门翻转",orbitalMorphDesc:"礼花将红门逆转为蓝门，并令所有蓝门升阶与集体喷兵",nodes:[{id:"gate_t1",branchId:"gate",tier:1,icon:xe.gate_t1,name:"倍增充能",desc:"蓝门充能升级提速，红门翻转加快且扣减降低，附加双联分流",maxRank:3,pointCost:1,statText:i=>`蓝门充能×${i+1}倍 · 红门逆转+${i*45}% · 双联+${i*20}%`},{id:"gate_t2",branchId:"gate",tier:2,icon:xe.gate_t2,name:"高阶蓝门",desc:"突破蓝门+4上限至最高+7！满级时所有+N门固定额外+1兵",maxRank:3,pointCost:1,prereq:"gate_t1",statText:i=>`蓝门上限升至+${4+i}${i>=3?" · 所有+N门额外+1兵":""}`},{id:"gate_t3",branchId:"gate",tier:3,icon:xe.gate_t3,name:"过门强化",desc:"穿过蓝门的波波获得护盾与增伤；每道蓝门定期发射星光并自动喷兵",maxRank:3,pointCost:2,prereq:"gate_t2",statText:i=>`过门血+${i*16}% 攻+${i*10}% · 蓝门每4.2s自喷${i}兵`},{id:"gate_t4",branchId:"gate",tier:4,icon:xe.gate_t4,name:"双倍倍增",desc:"开局自动翻转1座红门，过门22%概率暴击双倍出兵，翻门触发全屏治疗波，解锁【完全体大招】",maxRank:1,pointCost:4,prereq:"gate_t3",isKeystone:!0,statText:i=>i>0?"开局翻红门 + 22%双倍暴击 + 翻转全屏波 + 完全体大招":"效果：开局翻红门 + 22%双倍过门 + 完全体大招"}]},{id:"plasma",icon:xn.plasma,name:"喵喵族·电音流",raceName:"喵喵族",unitName:"电音喵兵",heroName:"电音领队",modelDesc:"猫耳金耳机 · 闪电荧光棒",subtitle:"高能暴击 · 连锁闪电 · 落雷激光",accentColor:"#e6a100",hammerMorphName:"雷电震击",hammerMorphDesc:"跃击迸发多道闪电麻痹敌群，并高能强化周围友军",orbitalMorphName:"全员超频",orbitalMorphDesc:"礼花化为电网，将场上波波集体进化为高能电音兵",nodes:[{id:"plasma_t1",branchId:"plasma",tier:1,icon:xe.plasma_t1,name:"电音暴击",desc:"蒸汽炮高概率射出黄金电音兵，并提升电音兵的暴击伤害与移速",maxRank:3,pointCost:1,statText:i=>`电音兵率+${i*22}% · 电音暴伤+${i*16}%`},{id:"plasma_t2",branchId:"plasma",tier:2,icon:xe.plasma_t2,name:"连锁闪电",desc:"电音兵攻击50%概率触发弹射闪电链，领队跃击迸发全屏电弧",maxRank:3,pointCost:1,prereq:"plasma_t1",statText:i=>`50%弹射${i+1}道电弧(${40+i*12}%伤) · 跃击+${i*3}道雷`},{id:"plasma_t3",branchId:"plasma",tier:3,icon:xe.plasma_t3,name:"落雷破甲",desc:"对重甲/首领/护盾造成额外破防与震晕；每隔数秒自动降下落雷",maxRank:3,pointCost:2,prereq:"plasma_t2",statText:i=>`破甲+${i*18}% · 每${(4.2-i*.5).toFixed(1)}s自动落雷`},{id:"plasma_t4",branchId:"plasma",tier:4,icon:xe.plasma_t4,name:"贯穿激光",desc:"常驻100%黄金电音兵，每15发普攻或放技能自动齐射3道贯穿激光，解锁【完全体大招】",maxRank:1,pointCost:4,prereq:"plasma_t3",isKeystone:!0,statText:i=>i>0?"100%电音兵 + 3道贯穿激光 + 完全体大招":"效果：100%电音兵 + 3道贯穿激光 + 完全体大招"}]},{id:"orbital",icon:xn.orbital,name:"云朵族·礼花流",raceName:"云朵族",unitName:"云朵波波",heroName:"云朵领队",modelDesc:"蓬松云翼 · 黄金指挥杖",subtitle:"飞艇轰炸 · 旋涡聚怪 · 双招互充",accentColor:"#a855f7",hammerMorphName:"音符飞弹",hammerMorphDesc:"跃击齐射追踪音符飞弹，并大幅回充全屏礼花能量",orbitalMorphName:"旋涡礼花",orbitalMorphDesc:"礼花生成旋涡聚拢敌群，并留下持续灼烧的星火区",nodes:[{id:"orbital_t1",branchId:"orbital",tier:1,icon:xe.orbital_t1,name:"飞艇轰炸",desc:"充能速度与开局能量提升；空中飞艇每隔数秒自动投下礼花弹轰击敌群",maxRank:3,pointCost:1,statText:i=>`充能+${i*16}% · 每${(5.6-i*.7).toFixed(1)}s飞艇自动轰炸`},{id:"orbital_t2",branchId:"orbital",tier:2,icon:xe.orbital_t2,name:"聚怪易伤",desc:"飞艇轰炸与大招均产生聚怪旋涡并施加易伤减速；领队跃击齐射追踪飞弹",maxRank:3,pointCost:1,prereq:"orbital_t1",statText:i=>`旋涡聚怪+易伤${15+i*10}% · 跃击齐射${i+1}枚飞弹`},{id:"orbital_t3",branchId:"orbital",tier:3,icon:xe.orbital_t3,name:"回能连射",desc:"释放任一大招后蒸汽炮进入【速射+双联+高能】过载，并向另一大招返还充能",maxRank:3,pointCost:2,prereq:"orbital_t2",statText:i=>`过载连射${(1.5+i*1.3).toFixed(1)}s · 双招互返+${8+i*6}%充能`},{id:"orbital_t4",branchId:"orbital",tier:4,icon:xe.orbital_t4,name:"全屏星火",desc:"飞艇升级双联礼花弹，大招进化为全屏轰炸并留下4.5s灼烧星火区，解锁【完全体大招】",maxRank:1,pointCost:4,prereq:"orbital_t3",isKeystone:!0,statText:i=>i>0?"双联飞艇轰炸 + 4.5s星火区 + 完全体大招":"效果：双联轰炸 + 4.5s全屏星火 + 完全体大招"}]},{id:"bastion",icon:xn.bastion,name:"曲奇族·堡垒流",raceName:"曲奇族",unitName:"曲奇盾兵",heroName:"曲奇统领",modelDesc:"战旗披风 · 黄铜圆盾与长枪",subtitle:"全军护盾 · 基地副炮 · 卫队反推",accentColor:"#4eb832",hammerMorphName:"修复震退",hammerMorphDesc:"跃击修复泡泡站与友军生命，并强力震退敌群与震碎障碍",orbitalMorphName:"卫队空降",orbitalMorphDesc:"礼花修复泡泡站、震碎障碍，并在防线前空投重装曲奇卫队",nodes:[{id:"bastion_t1",branchId:"bastion",tier:1,icon:xe.bastion_t1,name:"坚固盾甲",desc:"泡泡站生命提升且每秒自愈；所有出战波波手执圆盾，血量与减伤显著提升",maxRank:3,pointCost:1,statText:i=>`泡泡站HP+${i*18}% · 全军血量+${i*18}% 减伤+${i*8}%`},{id:"bastion_t2",branchId:"bastion",tier:2,icon:xe.bastion_t2,name:"基地副炮",desc:"泡泡站两侧架设双联副炮，自动远距轰击桥面敌人并附带击退",maxRank:3,pointCost:1,prereq:"bastion_t1",statText:i=>`双副炮每${(1.45-i*.2).toFixed(2)}s远距轰击 (${22+i*14}×战力)`},{id:"bastion_t3",branchId:"bastion",tier:3,icon:xe.bastion_t3,name:"重装卫士",desc:"攻城破障增伤且大幅减免地形伤害；每隔数发普攻直接派出1名重装卫士",maxRank:3,pointCost:2,prereq:"bastion_t2",statText:i=>`攻城+${i*20}% · 每${13-i*2}发普攻直出1名重装卫士`},{id:"bastion_t4",branchId:"bastion",tier:4,icon:xe.bastion_t4,name:"守护反推",desc:"每9.5s或泡泡站受损时自动爆发全屏反推波并空投4名重装卫士，解锁【完全体大招】",maxRank:1,pointCost:4,prereq:"bastion_t3",isKeystone:!0,statText:i=>i>0?"周期全屏反推波 + 4名重装卫士 + 完全体大招":"效果：全屏守护反推波 + 4名卫士 + 完全体大招"}]},{id:"tycoon",icon:xn.tycoon,name:"招财族·赏金流",raceName:"招财族",unitName:"招财波波",heroName:"招财领队",modelDesc:"招财金角 · 聚宝金币筒",subtitle:"高倍爆金 · 升级打折 · 存款增伤",accentColor:"#e09b14",hammerMorphName:"震地爆金",hammerMorphDesc:"领队每次跃击震地爆出金币喷泉，并附带高额破防伤害",orbitalMorphName:"招财礼花",orbitalMorphDesc:"礼花清场爆高倍金币，并召唤黄金送宝猪与招财小队",nodes:[{id:"tycoon_t1",branchId:"tycoon",tier:1,icon:xe.tycoon_t1,name:"击败爆金",desc:"全渠道金币大幅提升，击败敌人30%概率额外爆金，释放大招直接喷发金币",maxRank:3,pointCost:1,statText:i=>`赏金+${i*16}% · 击败爆金 · 跃击每下+${i*6+5}金币`},{id:"tycoon_t2",branchId:"tycoon",tier:2,icon:xe.tycoon_t2,name:"升级折扣",desc:"局内升级大幅打折；黄金送宝怪刷新加快、移速变慢且爆金量提升50%",maxRank:3,pointCost:1,prereq:"tycoon_t1",statText:i=>`局内升级-${i*10}% · 送宝怪高频慢速且赏金+50%`},{id:"tycoon_t3",branchId:"tycoon",tier:3,icon:xe.tycoon_t3,name:"存款增伤",desc:"持有的金币存款按比例转化为全军战力；普攻有概率射出黄金招财兵(击败必爆金)",maxRank:3,pointCost:2,prereq:"tycoon_t2",statText:i=>`存款最高+${i*22}%战力 · 普攻${i*10}%射出招财兵`},{id:"tycoon_t4",branchId:"tycoon",tier:4,icon:xe.tycoon_t4,name:"招财空投",desc:"每赚180金币或放技能自动空投5只招财精英兵，局内升级20%免单连升，解锁【完全体大招】",maxRank:1,pointCost:4,prereq:"tycoon_t3",isKeystone:!0,statText:i=>i>0?"赚金空投招财兵 + 20%升级免单 + 完全体大招":"效果：空投招财精英兵 + 升级免单 + 完全体大招"}]}],Mn=Re.flatMap(i=>i.nodes),nd=[{name:"好男人未来",bestStage:28,totalKills:48620,playTimeSeconds:14820,skinName:"梦幻偶像舞台",badgeColor:"#ee5c9c",isBot:!0},{name:"星梦应援团长",bestStage:23,totalKills:36410,playTimeSeconds:11580,skinName:"皇家焦糖布丁",badgeColor:"#d99016",isBot:!0},{name:"焦糖布丁大王",bestStage:19,totalKills:29850,playTimeSeconds:9420,skinName:"皇家焦糖布丁",badgeColor:"#d99016",isBot:!0},{name:"电音喵喵DJ",bestStage:16,totalKills:23190,playTimeSeconds:7650,skinName:"葡萄星梦冻",badgeColor:"#a86cf5",isBot:!0},{name:"兔耳魔法师",bestStage:14,totalKills:19400,playTimeSeconds:6380,skinName:"葡萄星梦冻",badgeColor:"#a86cf5",isBot:!0},{name:"青柠汽水波波",bestStage:12,totalKills:15820,playTimeSeconds:5120,skinName:"青苹果软糖",badgeColor:"#58b938",isBot:!0},{name:"蒸汽工坊克星",bestStage:9,totalKills:11260,playTimeSeconds:3840,skinName:"青苹果软糖",badgeColor:"#58b938",isBot:!0},{name:"草莓甜心主唱",bestStage:6,totalKills:7450,playTimeSeconds:2560,skinName:"草莓甜心冻",badgeColor:"#fb6d7f",isBot:!0},{name:"泡泡站长老王",bestStage:4,totalKills:4680,playTimeSeconds:1620,skinName:"草莓甜心冻",badgeColor:"#fb6d7f",isBot:!0},{name:"见习应援生",bestStage:2,totalKills:1920,playTimeSeconds:780,skinName:"海盐汽水糖",badgeColor:"#25c4f8",isBot:!0}],id="swarm_control_3d_save_v3",sd=[{id:"barrel_overheat",icon:fa.barrel_overheat,title:"蒸汽阀泄压",desc:"蒸汽炮气压表波动，发射射速降低 15%",shortText:"射速-15%"},{id:"gene_instability",icon:fa.gene_instability,title:"糖分不足疲软",desc:"波波果冻团缺乏糖分补给，全军生命与攻击降低 15%",shortText:"战力-15%"},{id:"shield_fracture",icon:fa.shield_fracture,title:"泡泡站围栏破损",desc:"我方泡泡站防护受损，最大生命值降低 25%",shortText:"泡泡站HP-25%"},{id:"reactor_leak",icon:fa.reactor_leak,title:"音响扩音受阻",desc:"安可演唱会与礼花秀充能效率降低 30%",shortText:"充能-30%"},{id:"cryo_sludge",icon:fa.cryo_sludge,title:"工坊黑油沾染",desc:"鞋底沾上厂房黑机油，波波团冲锋移速降低 12%",shortText:"移速-12%"}];class Ux{constructor(){B(this,"gold",160);B(this,"unlockedLevel",50);B(this,"currentLevelIndex",0);B(this,"fireRateLevel",1);B(this,"powerLevel",1);B(this,"championLevel",1);B(this,"lootLevel",1);B(this,"metaLevels",{});B(this,"ownedSkins",["azure"]);B(this,"equippedSkin","azure");B(this,"skinRanks",{});B(this,"skinShards",{});B(this,"skillNodes",{});B(this,"selectedRaceId","swarm");B(this,"bonusTalentPoints",0);B(this,"skillRespecCount",0);B(this,"stagesPlayedSinceRespec",0);B(this,"lastShareBonusDate","");B(this,"claimedReferralFrom","");B(this,"playerId",`cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`);B(this,"playerName",`指挥官${Math.floor(1e3+Math.random()*9e3)}`);B(this,"bestStageCleared",0);B(this,"totalMatchesPlayed",0);B(this,"lifetimeKills",0);B(this,"playTimeSeconds",0);B(this,"playTimeSaveAccum",0);B(this,"remoteLeaderboard",[...nd]);B(this,"remoteActiveLeaderboard",[...nd]);B(this,"remoteRealPlayerCount",0);B(this,"buffStacks",{});B(this,"activeDebuffs",[]);B(this,"weapon","gatling");B(this,"mechaMode","hammer");B(this,"championCharge",25);B(this,"orbitalCharge",15);B(this,"stageClonesSpawned",0);B(this,"stageMutantsKilled",0);B(this,"stageGoldEarned",0);this.load()}load(){try{const t=localStorage.getItem(id);if(!t)return;const e=JSON.parse(t);typeof e.gold=="number"&&(this.gold=e.gold),this.currentLevelIndex=0,this.fireRateLevel=1,this.powerLevel=1,this.championLevel=1,this.lootLevel=1,this.buffStacks={},this.activeDebuffs=[],e.mechaMode&&Ur[e.mechaMode]&&(this.mechaMode=e.mechaMode),e.metaLevels&&typeof e.metaLevels=="object"&&(this.metaLevels={...e.metaLevels}),Array.isArray(e.ownedSkins)&&e.ownedSkins.length>0&&(this.ownedSkins=Array.from(new Set(["azure",...e.ownedSkins]))),e.equippedSkin&&this.ownedSkins.includes(e.equippedSkin)&&(this.equippedSkin=e.equippedSkin),e.skinRanks&&typeof e.skinRanks=="object"&&(this.skinRanks={...e.skinRanks}),e.skinShards&&typeof e.skinShards=="object"&&(this.skinShards={...e.skinShards}),typeof e.playerId=="string"&&e.playerId.trim()&&(this.playerId=e.playerId.trim().slice(0,40)),typeof e.playerName=="string"&&e.playerName.trim()&&(this.playerName=e.playerName.trim().slice(0,14)),typeof e.bestStageCleared=="number"&&(this.bestStageCleared=Math.max(0,e.bestStageCleared)),typeof e.totalMatchesPlayed=="number"?this.totalMatchesPlayed=Math.max(this.bestStageCleared,e.totalMatchesPlayed):this.totalMatchesPlayed=this.bestStageCleared,typeof e.lifetimeKills=="number"&&(this.lifetimeKills=Math.max(0,e.lifetimeKills)),typeof e.playTimeSeconds=="number"&&e.playTimeSeconds>0?this.playTimeSeconds=Math.max(0,e.playTimeSeconds):(this.totalMatchesPlayed>0||this.lifetimeKills>0)&&(this.playTimeSeconds=Math.round(this.totalMatchesPlayed*45+this.lifetimeKills*.12)),e.skillNodes&&typeof e.skillNodes=="object"&&(this.skillNodes={...e.skillNodes}),typeof e.selectedRaceId=="string"&&Re.some(n=>n.id===e.selectedRaceId)&&(this.selectedRaceId=e.selectedRaceId),typeof e.bonusTalentPoints=="number"&&(this.bonusTalentPoints=Math.max(0,e.bonusTalentPoints)),typeof e.skillRespecCount=="number"&&(this.skillRespecCount=Math.max(0,e.skillRespecCount)),typeof e.stagesPlayedSinceRespec=="number"?this.stagesPlayedSinceRespec=Math.max(0,e.stagesPlayedSinceRespec):this.stagesPlayedSinceRespec=this.totalMatchesPlayed,typeof e.lastShareBonusDate=="string"&&(this.lastShareBonusDate=e.lastShareBonusDate),typeof e.claimedReferralFrom=="string"&&(this.claimedReferralFrom=e.claimedReferralFrom),this.sanitizeSkillTreeState()}catch{}}resetRunProgression(){this.currentLevelIndex=0,this.fireRateLevel=1,this.powerLevel=1,this.championLevel=1,this.lootLevel=1,this.buffStacks={},this.activeDebuffs=[];const t=this.getStartingSkillCharge();this.championCharge=t,this.orbitalCharge=t,this.save()}save(){try{const t={gold:Math.floor(this.gold),unlockedLevel:this.unlockedLevel,currentLevelIndex:0,fireRateLevel:1,powerLevel:1,championLevel:1,lootLevel:1,mechaMode:this.mechaMode,metaLevels:this.metaLevels,ownedSkins:this.ownedSkins,equippedSkin:this.equippedSkin,skinRanks:this.skinRanks,skinShards:this.skinShards,playerId:this.playerId,playerName:this.playerName,bestStageCleared:this.bestStageCleared,totalMatchesPlayed:this.totalMatchesPlayed,lifetimeKills:this.lifetimeKills,playTimeSeconds:Math.floor(this.playTimeSeconds),skillNodes:this.skillNodes,selectedRaceId:this.selectedRaceId,bonusTalentPoints:this.bonusTalentPoints,skillRespecCount:this.skillRespecCount,stagesPlayedSinceRespec:this.stagesPlayedSinceRespec,lastShareBonusDate:this.lastShareBonusDate,claimedReferralFrom:this.claimedReferralFrom,buffStacks:{},activeDebuffs:[]};localStorage.setItem(id,JSON.stringify(t))}catch{}}recordBattleStats(t,e){this.totalMatchesPlayed+=1,this.stagesPlayedSinceRespec+=1,this.lifetimeKills+=Math.max(0,e),t>this.bestStageCleared&&(this.bestStageCleared=t),this.totalMatchesPlayed<this.bestStageCleared&&(this.totalMatchesPlayed=this.bestStageCleared),this.save(),this.syncRemoteLeaderboard(!0)}setPlayerName(t){const e=t.trim().slice(0,20);e&&(this.playerName=e,this.save(),this.syncRemoteLeaderboard(!0))}getTodayKey(){const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}canClaimDailyShareBonus(){return this.lastShareBonusDate!==this.getTodayKey()}claimDailyShareBonus(){const t=this.getEquippedSkin();if(!this.canClaimDailyShareBonus())return{claimed:!1,goldAwarded:0,shardsAwarded:0,skinName:t.name};this.lastShareBonusDate=this.getTodayKey();const e=3e3,n=5;return this.gold+=e,this.skinShards[this.equippedSkin]=(this.skinShards[this.equippedSkin]||0)+n,this.save(),{claimed:!0,goldAwarded:e,shardsAwarded:n,skinName:t.name}}checkAndClaimReferralWelcome(){try{const t=new URLSearchParams(window.location.search),e=(t.get("ref")||"").trim(),n=(t.get("from")||"星际战友").trim().slice(0,14);if((t.has("ref")||t.has("from"))&&window.history.replaceState({},"",window.location.pathname),!e||e===this.playerId||this.claimedReferralFrom)return null;this.claimedReferralFrom=e;const s=2e3;return this.gold+=s,this.save(),{fromName:n,goldAwarded:s}}catch{return null}}buildShareChallengeText(t,e){const s=`${window.location.origin||"https://mob-control.yinosites.com"}/?ref=${encodeURIComponent(this.playerId)}&from=${encodeURIComponent(this.playerName)}`,a=this.getCommittedSkillBranch(),o=a?`【${a.name}】`:"";if(t&&e){const l=e<10?`⚡${e.toFixed(1)}秒极速闪击`:`${e.toFixed(1)}秒`;return{url:s,text:`🔥 我在《星际狂潮：克隆防线》用${o} ${l}攻破第 ${t} 关（累计歼敌 ${this.lifetimeKills.toLocaleString()}）！免下载点开即玩，新指挥官进场直接领 2,000⚡ 补给：${s}`}}const r=Math.max(1,this.bestStageCleared);return{url:s,text:`🏆 我在《星际狂潮：克隆防线》已打到第 ${r} 关（游戏时长 ${this.formatPlayTime()} · 歼敌 ${this.lifetimeKills.toLocaleString()}）！免下载3D倍增门暴兵爽游，点开直接领 2,000⚡ 战友补给：${s}`}}tickPlayTime(t){t<=0||t>1||(this.playTimeSeconds+=t,this.playTimeSaveAccum+=t,this.playTimeSaveAccum>=15&&(this.playTimeSaveAccum=0,this.save()))}formatPlayTime(t){const e=Math.max(1,Math.floor(t??this.playTimeSeconds));if(e>=3600){const n=Math.floor(e/3600),s=Math.floor(e%3600/60);return s>0?`${n}小时${s}分`:`${n}小时`}if(e>=60){const n=Math.floor(e/60),s=e%60;return s>0?`${n}分${s}秒`:`${n}分钟`}return`${e}秒`}getEntryPlayTime(t){return typeof t.playTimeSeconds=="number"&&t.playTimeSeconds>0?Math.floor(t.playTimeSeconds):Math.max(60,Math.round((t.bestStage||1)*145+(t.totalKills||0)*.15))}getTop10Leaderboard(){const t=this.getEquippedSkin(),e=this.remoteLeaderboard.filter(c=>c.name!==this.playerName&&(!c.playerId||c.playerId!==this.playerId)).map(c=>({...c,playTimeSeconds:this.getEntryPlayTime(c),isSelf:!1})),n=e.filter(c=>!c.isBot),s=e.filter(c=>!!c.isBot);(this.bestStageCleared>0||this.lifetimeKills>0)&&n.push({playerId:this.playerId,name:this.playerName,bestStage:this.bestStageCleared,totalKills:this.lifetimeKills,playTimeSeconds:Math.floor(this.playTimeSeconds),skinName:t.name,badgeColor:t.badgeColor,isBot:!1,isSelf:!0}),n.sort((c,d)=>d.bestStage-c.bestStage||d.totalKills-c.totalKills);const a=n.slice(0,10),o=Math.max(0,10-a.length),r=[...a,...s.slice(0,o)];r.sort((c,d)=>d.bestStage-c.bestStage||d.totalKills-c.totalKills);const l=r.findIndex(c=>c.isSelf);return{top10:r.slice(0,10),selfRank:l>=0?l+1:null,realCount:Math.max(this.remoteRealPlayerCount,n.length)}}getTop10ActiveLeaderboard(){const t=this.getEquippedSkin(),n=(this.remoteActiveLeaderboard.length>0?this.remoteActiveLeaderboard:this.remoteLeaderboard).filter(d=>d.name!==this.playerName&&(!d.playerId||d.playerId!==this.playerId)).map(d=>({...d,playTimeSeconds:this.getEntryPlayTime(d),isSelf:!1})),s=n.filter(d=>!d.isBot),a=n.filter(d=>!!d.isBot);(this.bestStageCleared>0||this.lifetimeKills>0||this.playTimeSeconds>=10)&&s.push({playerId:this.playerId,name:this.playerName,bestStage:this.bestStageCleared,totalKills:this.lifetimeKills,playTimeSeconds:Math.max(1,Math.floor(this.playTimeSeconds)),skinName:t.name,badgeColor:t.badgeColor,isBot:!1,isSelf:!0}),s.sort((d,u)=>(u.playTimeSeconds||0)-(d.playTimeSeconds||0)||u.bestStage-d.bestStage);const o=s.slice(0,10),r=Math.max(0,10-o.length),l=[...o,...a.slice(0,r)];l.sort((d,u)=>(u.playTimeSeconds||0)-(d.playTimeSeconds||0)||u.bestStage-d.bestStage);const c=l.findIndex(d=>d.isSelf);return{top10:l.slice(0,10),selfRank:c>=0?c+1:null,realCount:Math.max(this.remoteRealPlayerCount,s.length)}}async syncRemoteLeaderboard(t=!1){try{const e=this.getEquippedSkin(),n=this.bestStageCleared>0||this.lifetimeKills>0||this.playTimeSeconds>=30,s=t&&n,a=await fetch("/api/leaderboard",{method:s?"POST":"GET",headers:s?{"content-type":"application/json"}:void 0,body:s?JSON.stringify({playerId:this.playerId,name:this.playerName,bestStage:this.bestStageCleared,totalKills:this.lifetimeKills,playTimeSeconds:Math.floor(this.playTimeSeconds),skinName:e.name,badgeColor:e.badgeColor}):void 0});if(!a.ok)return;const o=await a.json();typeof o.realPlayerCount=="number"&&(this.remoteRealPlayerCount=o.realPlayerCount),Array.isArray(o.top10)&&o.top10.length>0&&(this.remoteLeaderboard=o.top10),Array.isArray(o.activeTop10)&&o.activeTop10.length>0?this.remoteActiveLeaderboard=o.activeTop10:Array.isArray(o.top10)&&o.top10.length>0&&(this.remoteActiveLeaderboard=[...o.top10])}catch{}}getMetaLevel(t){return this.metaLevels[t]||0}getMetaUpgradeCost(t){const e=za.find(s=>s.id===t),n=this.getMetaLevel(t);return Math.floor(e.baseCost*Math.pow(e.costMult,n))}buyMetaUpgrade(t){const e=za.find(a=>a.id===t);if(!e)return!1;const n=this.getMetaLevel(t);if(n>=e.maxLevel)return!1;const s=this.getMetaUpgradeCost(t);return this.gold<s?!1:(this.gold-=s,this.metaLevels[t]=n+1,this.save(),!0)}getEquippedSkin(){return Un.find(t=>t.id===this.equippedSkin)||Un[0]}getSkinRankIndex(t){return Math.min(ze.length-1,Math.max(0,this.skinRanks[t]||0))}getSkinRankSpec(t){return ze[this.getSkinRankIndex(t)]||ze[0]}getSkinBonusMult(t){return this.ownedSkins.includes(t)?this.getSkinRankSpec(t).bonusMult:0}getSkinShards(t){return Math.max(0,this.skinShards[t]||0)}canAscendSkin(t){const e=Un.find(m=>m.id===t)||Un[0],n=this.getSkinRankIndex(t),s=ze[n],a=n>=ze.length-1,o=a?null:ze[n+1],r=this.getSkinShards(t),l=s.shardsToNext,c=a?0:Math.round(s.goldToNext*e.ascendGoldMult),d=r>=l,u=this.gold>=c;return{ok:this.ownedSkins.includes(t)&&!a&&d&&u,isMaxRank:a,currentShards:r,requiredShards:l,requiredGold:c,hasEnoughShards:d,hasEnoughGold:u,currentRank:s,nextRank:o}}ascendSkin(t){const e=this.canAscendSkin(t);return!e.ok||!e.nextRank?!1:(this.gold=Math.max(0,this.gold-e.requiredGold),this.skinShards[t]=Math.max(0,e.currentShards-e.requiredShards),this.skinRanks[t]=e.nextRank.index,this.save(),!0)}rollStageSkinShardDrop(t){if(this.ownedSkins.length===0)return null;const e=this.ownedSkins.filter(f=>this.getSkinRankIndex(f)<ze.length-1),n=e.length>0?e:this.ownedSkins;let s;n.includes(this.equippedSkin)&&Math.random()<.6?s=this.equippedSkin:s=n[Math.floor(Math.random()*n.length)];const a=t%10===0,o=t%10===5,c=2+Math.floor(Math.random()*3)+Math.floor(t/10)+(a?6:o?3:0);this.skinShards[s]=(this.skinShards[s]||0)+c,this.save();const d=Un.find(f=>f.id===s)||Un[0],u=this.canAscendSkin(s);return{skinId:s,skinName:d.name,badgeColor:d.badgeColor,amount:c,currentShards:u.currentShards,nextRequired:u.requiredShards,rankSpec:u.currentRank,canAscendNow:u.ok}}buyOrEquipSkin(t){const e=Un.find(n=>n.id===t);return e?this.ownedSkins.includes(t)?(this.equippedSkin=t,this.save(),"equipped"):this.gold<e.cost?"insufficient":(this.gold-=e.cost,this.ownedSkins.push(t),this.skinRanks[t]===void 0&&(this.skinRanks[t]=0),this.equippedSkin=t,this.save(),"bought"):"insufficient"}getStartingSkillCharge(){const t=this.getSkillNodeRank("orbital_t1")*10;return Math.min(75,12+this.getMetaLevel("meta_capacitor")*3+t)}getUltimateEvolutionSpec(){const t=this.getSpentTalentPoints(),e=!!this.getActiveKeystoneSpec(),n=this.championLevel,s=t+Math.max(0,n-1)*1.4+(e?10:0);let a=0;return e||s>=14?a=3:s>=7.5?a=2:s>=3?a=1:a=0,{tier:a,badge:{0:"雏形",1:"一阶",2:"觉醒",3:"完全体"}[a],isCompleteForm:a===3,dmgMult:a===0?.58:a===1?.78:a===2?1:1.28,radiusMult:a===0?.52:a===1?.72:a===2?.92:1.16,mechaScaleMult:a===0?.78:a===1?.94:a===2?1.1:1.28,hammerAftershockWaves:a===0?0:a===1?1:a===2?2:4,orbitalFollowupWaves:a===0?0:a===1?1:a===2?3:5,orbitalZHalfSpan:a===0?5.2:a===1?8.8:a===2?13.5:99,orbitalXHalfSpan:a===0?4.5:a===1?6.8:a===2?9.5:99}}getSkillNodeRank(t){return this.skillNodes[t]||0}getEffectiveMatchesPlayed(){return Math.max(0,this.totalMatchesPlayed,this.bestStageCleared)}getRequiredMatchesForNodeRank(t,e){return t===1?e<=1?0:e===2?1:2:t===2?e<=1?4:e===2?6:8:t===3?e<=1?11:e===2?14:17:20}getMaxSkillPointsByMatches(){const t=this.getEffectiveMatchesPlayed();return t<1?1:t<2?2:t<4?3:t<6?4:t<8?5:t<11?6:t<14?8:t<17?10:t<20?12:16}getNextMatchUnlockHint(){const t=this.getEffectiveMatchesPlayed(),e=[{req:1,label:"T1 二级"},{req:2,label:"T1 满级"},{req:4,label:"T2 技能"},{req:6,label:"T2 二级"},{req:8,label:"T2 满级"},{req:11,label:"T3 技能"},{req:14,label:"T3 二级"},{req:17,label:"T3 满级"},{req:20,label:"👑 T4 基石"}];for(const n of e)if(t<n.req)return`再战 ${n.req-t} 局解锁【${n.label}】`;return"全阶 16 点槽位已全解锁"}sanitizeSkillTreeState(){const t=new Set,e=this.getEffectiveMatchesPlayed();let n=!1;for(const s of Mn){const a=this.getSkillNodeRank(s.id);if(!(a<=0)&&(t.add(s.branchId),a>s.maxRank&&(n=!0),e<this.getRequiredMatchesForNodeRank(s.tier,a)&&(n=!0),s.prereq)){const o=Mn.find(r=>r.id===s.prereq);o&&this.getSkillNodeRank(s.prereq)<o.maxRank&&(n=!0)}}(t.size>1||n||this.getSpentTalentPoints()>this.getTotalTalentPoints()||this.getSpentTalentPoints()>this.getMaxSkillPointsByMatches())&&(this.skillNodes={})}getUncappedTalentPoints(){const t=Math.max(0,this.bestStageCleared),e=this.getEffectiveMatchesPlayed(),n=Math.floor(e/2),s=Math.floor(t/3),a=Math.floor((t+5)/10),o=Math.floor(t/10)*2;return 1+n+s+a+o+this.bonusTalentPoints}getTotalTalentPoints(){return Math.min(this.getMaxSkillPointsByMatches(),this.getUncappedTalentPoints())}getSpentTalentPoints(){let t=0;for(const e of Mn){const n=this.getSkillNodeRank(e.id);n>0&&(t+=n*e.pointCost)}return t}getAvailableTalentPoints(){return Math.max(0,this.getTotalTalentPoints()-this.getSpentTalentPoints())}getCommittedSkillBranch(){for(const t of Re)for(const e of t.nodes)if(this.getSkillNodeRank(e.id)>0)return t;return null}getActiveRaceBranch(){const t=this.getCommittedSkillBranch();return t?(this.selectedRaceId=t.id,t):Re.find(e=>e.id===this.selectedRaceId)||Re[0]}selectRaceBranch(t){const e=this.getCommittedSkillBranch();return e&&e.id!==t||this.selectedRaceId===t?!1:(this.selectedRaceId=t,this.save(),!0)}getActiveKeystoneSpec(){for(const t of Re)for(const e of t.nodes)if(e.isKeystone&&this.getSkillNodeRank(e.id)>0)return{branch:t,node:e};return null}getSkillNodeUpgradeGoldCost(t,e){return t===1?e<=1?120:e===2?2500:6e3:t===2?e<=1?12e3:e===2?2e4:32e3:t===3?e<=1?5e4:e===2?75e3:11e4:2e5}canUpgradeSkillNode(t){const e=Mn.find(c=>c.id===t);if(!e)return{ok:!1,reason:"未知节点",goldCost:0};const n=this.getSkillNodeRank(t);if(n>=e.maxRank)return{ok:!1,reason:"已满级",goldCost:0};const s=n+1,a=this.getSkillNodeUpgradeGoldCost(e.tier,s),o=this.getCommittedSkillBranch();if(o&&o.id!==e.branchId)return{ok:!1,reason:`已锁【${o.name.replace("流","")}】(需洗点换线)`,goldCost:a};if(e.prereq){const c=Mn.find(u=>u.id===e.prereq),d=this.getSkillNodeRank(e.prereq);if(c&&d<c.maxRank)return{ok:!1,reason:`需先点满「${c.name}」(${d}/${c.maxRank})`,goldCost:a}}const r=this.getRequiredMatchesForNodeRank(e.tier,s),l=this.getEffectiveMatchesPlayed();return l<r?{ok:!1,reason:`需完成 ${r} 局解锁 (${l}/${r}局)`,reqMatches:r,goldCost:a}:this.getSpentTalentPoints()+e.pointCost>this.getMaxSkillPointsByMatches()?{ok:!1,reason:`当前局数上限 ${this.getMaxSkillPointsByMatches()} 点`,goldCost:a}:this.getAvailableTalentPoints()<e.pointCost?{ok:!1,reason:`需 ${e.pointCost}点 + ${a.toLocaleString()}⚡`,goldCost:a}:this.gold<a?{ok:!1,reason:`需 ${e.pointCost}点 + ${a.toLocaleString()}⚡ (点数不足)`,goldCost:a}:{ok:!0,reason:`⬆️ 升级 (${e.pointCost}点 + ${a.toLocaleString()}⚡)`,goldCost:a}}upgradeSkillNode(t){const e=this.canUpgradeSkillNode(t);if(!e.ok)return!1;const n=Mn.find(s=>s.id===t);return n&&(this.selectedRaceId=n.branchId),this.gold=Math.max(0,this.gold-e.goldCost),this.skillNodes[t]=(this.skillNodes[t]||0)+1,this.save(),!0}getBaseResetSkillTreeCost(){const t=Math.max(1,this.getSpentTalentPoints());return Math.floor(8e3+t*3500+this.skillRespecCount*1e4)}getResetSkillTreeDiscount(){return Math.max(0,this.stagesPlayedSinceRespec)*1e3}getResetSkillTreeCost(){return Math.max(0,this.getBaseResetSkillTreeCost()-this.getResetSkillTreeDiscount())}resetSkillTree(){if(this.getSpentTalentPoints()<=0)return!1;const e=this.getResetSkillTreeCost();return this.gold<e?!1:(this.gold-=e,this.skillRespecCount+=1,this.stagesPlayedSinceRespec=0,this.skillNodes={},this.save(),!0)}getBonusTalentPointCost(){return Math.floor(15e3*Math.pow(1.85,this.bonusTalentPoints)+this.bonusTalentPoints*12e3)}canBuyBonusTalentPoint(){const t=this.getBonusTalentPointCost();return this.getUncappedTalentPoints()>=this.getMaxSkillPointsByMatches()?{ok:!1,reason:`🔒 局数上限 (${this.getEffectiveMatchesPlayed()}局)`}:this.gold<t?{ok:!1,reason:`⚡ ${t.toLocaleString()} 购1点`}:{ok:!0,reason:`⚡ ${t.toLocaleString()} 购1点`}}buyBonusTalentPoint(){if(!this.canBuyBonusTalentPoint().ok)return!1;const e=this.getBonusTalentPointCost();return this.gold-=e,this.bonusTalentPoints+=1,this.save(),!0}getMechaSpec(){return Ur[this.mechaMode]||Ur.hammer}cycleMechaMode(){const t=zr.indexOf(this.mechaMode);return this.mechaMode=zr[(t+1)%zr.length],this.save(),this.getMechaSpec()}getBuffStack(t){return this.buffStacks[t]||0}hasDebuff(t){return this.activeDebuffs.some(e=>e.id===t&&e.remainingStages>0)}getFireRatePerSec(){const t=2.7+(this.fireRateLevel-1)*.16,e=1+this.getMetaLevel("meta_firerate")*.025,n=1+this.getSkillNodeRank("swarm_t1")*.12,s=this.getSkillNodeRank("titan_t1"),a=s===1?.55:s===2?.48:s>=3?.42:1,o=1+.02*this.getSkinBonusMult("emerald")+.04*this.getSkinBonusMult("nebula"),r=1+this.getBuffStack("rapid_fire")*.05,l=this.hasDebuff("barrel_overheat")?.85:1;return t*e*n*a*o*r*l}getSwarmTrooperSpec(){const t=this.getSkillNodeRank("swarm_t1"),e=this.getSkillNodeRank("swarm_t2"),n=this.getSkillNodeRank("swarm_t3"),s=this.getSkillNodeRank("swarm_t4");return t<=0?{isSwarmMode:!1,scaleMult:1,speedMult:1,hpMult:1,dmgMult:1,gateExtraCloneChance:0,kamikazeDmgRatio:0,killMitosisChance:0}:{isSwarmMode:!0,scaleMult:.88,speedMult:1.1,hpMult:.86,dmgMult:.88,gateExtraCloneChance:e*.15,kamikazeDmgRatio:n>0?.28+n*.22:0,killMitosisChance:s>0?.18:0}}getBastionTrooperSpec(){const t=this.getSkillNodeRank("bastion_t1"),e=this.getSkillNodeRank("bastion_t3");return t<=0?{isBastionMode:!1,trooperHpMult:1,trooperDmgReduction:0,praetorianShotInterval:0}:{isBastionMode:!0,trooperHpMult:1+t*.18,trooperDmgReduction:t*.08,praetorianShotInterval:e>0?Math.max(5,13-e*2):0}}getGiantTrooperSpec(){const t=this.getSkillNodeRank("titan_t1"),e=this.getSkillNodeRank("titan_t2"),n=this.getSkillNodeRank("titan_t3"),s=this.getSkillNodeRank("titan_t4");return t<=0?{isGiantMode:!1,startFusionTier:0,t4DirectTier2Chance:0,maxFusionTier:1,baseScale:1,baseHpMult:1,baseDmgMult:1,fusionStatAmplify:1,cleaveRadius:0,cleaveRatio:0,dmgReduction:0}:{isGiantMode:!0,startFusionTier:1,t4DirectTier2Chance:s>0?.25:0,maxFusionTier:s>0?4:e>0?3:2,baseScale:1.38+t*.12,baseHpMult:1.55+t*.35,baseDmgMult:1.4+t*.25,fusionStatAmplify:1+e*.08+s*.1,cleaveRadius:1.35+n*.28,cleaveRatio:n>0?.1+n*.08:.08,dmgReduction:n*.05}}getPowerMultiplier(){const t=1+(this.powerLevel-1)*.08,e=1+this.getMetaLevel("meta_attack")*.03,n=this.getSkillNodeRank("tycoon_t3"),a=1+(n>0?Math.min(n*.22,Math.floor(Math.max(0,this.gold)/200)*(n*.018)):0),o=1+.02*this.getSkinBonusMult("crimson")+.04*this.getSkinBonusMult("nebula"),r=1+this.getBuffStack("hyper_gene")*.06,l=this.hasDebuff("gene_instability")?.85:1;return t*e*a*o*r*l}getChampionMultiplier(){const t=1+(this.championLevel-1)*.12,e=1+this.getMetaLevel("meta_attack")*.03,n=this.getUltimateEvolutionSpec(),s=(1+this.getSkillNodeRank("titan_t1")*.07)*n.dmgMult,a=1+this.getBuffStack("hyper_gene")*.06+this.getBuffStack("titan_reactor")*.05,o=this.hasDebuff("gene_instability")?.85:1;return t*e*s*a*o}getLootMultiplier(){const t=.05*this.getSkinBonusMult("imperium"),e=this.getSkillNodeRank("tycoon_t1")*.16;return 1+(this.lootLevel-1)*.07+this.getMetaLevel("meta_bounty")*.04+this.getBuffStack("war_plunder")*.07+e+t}getMoveSpeedMultiplier(){const t=1+this.getMetaLevel("meta_thruster")*.02,e=this.getSkillNodeRank("swarm_t1")>0?1.1:1,n=1+Math.min(.36,this.getBuffStack("nitro_stride")*.04),s=this.hasDebuff("cryo_sludge")?.88:1;return t*e*n*s}getExtraCloneChance(){const t=this.getSkillNodeRank("swarm_t1")*.32,e=this.getSkillNodeRank("gate_t1")*.2,n=this.getSkillNodeRank("swarm_t4")>0?1.25:0,s=this.getBuffStack("split_chamber")*.12;return Math.min(1.8,Math.max(n,t+e)+s)}getChargedCritChance(){if(this.getSkillNodeRank("plasma_t4")>0)return 1;const t=this.getSkillNodeRank("plasma_t1")*.22,e=this.getSkillNodeRank("tycoon_t3")*.1;return Math.min(1,this.getBuffStack("plasma_crit")*.1+t+e)}getMiniGiantChance(){return this.getSkillNodeRank("titan_t2")*.025}getSkillChargeMultiplier(){const t=1+.04*this.getSkinBonusMult("phantom"),e=1+this.getSkillNodeRank("orbital_t1")*.16,n=1+this.getBuffStack("titan_reactor")*.07,s=this.hasDebuff("reactor_leak")?.7:1;return t*e*n*s}getBaseHpMultiplier(){const t=1+this.getMetaLevel("meta_bastion")*.05,e=1+.015*this.getSkinBonusMult("azure"),n=1+this.getSkillNodeRank("bastion_t1")*.18,s=1+this.getBuffStack("bastion_aegis")*.1,a=this.hasDebuff("shield_fracture")?.75:1;return t*e*n*s*a}getGateBonusAdd(){const t=this.getSkillNodeRank("gate_t2")>=3?1:0;return Math.min(3,this.getBuffStack("gate_resonance")+t)}getMaxBlueGateCap(){return 4+this.getSkillNodeRank("gate_t2")}getSiegeDamageMultiplier(){const t=this.getSkillNodeRank("bastion_t3")*.2;return 1+this.getBuffStack("siege_breaker")*.1+t}getInMatchUpgradeDiscountMult(){return Math.max(.55,1-this.getSkillNodeRank("tycoon_t2")*.1)}getFireRateCost(){return Math.max(20,Math.floor(55*Math.pow(1.48,this.fireRateLevel-1)*this.getInMatchUpgradeDiscountMult()))}getPowerCost(){return Math.max(25,Math.floor(65*Math.pow(1.5,this.powerLevel-1)*this.getInMatchUpgradeDiscountMult()))}getChampionCost(){return Math.max(35,Math.floor(85*Math.pow(1.52,this.championLevel-1)*this.getInMatchUpgradeDiscountMult()))}getLootCost(){return Math.max(30,Math.floor(75*Math.pow(1.5,this.lootLevel-1)*this.getInMatchUpgradeDiscountMult()))}addGold(t){const e=Math.max(1,Math.round(t*this.getLootMultiplier()));return this.gold+=e,this.stageGoldEarned+=e,this.save(),e}rollStageRarity(){const t=Math.random();return t<.02?"legendary":t<.09?"epic":t<.32?"rare":"common"}getRarityMeta(t){switch(t){case"legendary":return{label:"传说强化",stacks:4};case"epic":return{label:"史诗强化",stacks:3};case"rare":return{label:"稀有强化",stacks:2};default:return{label:"普通强化",stacks:1}}}getAllRewardDefinitions(t,e="common",n=1){const{label:s,stacks:a}=this.getRarityMeta(e),o=Math.max(1,Math.round(n)),r=a*o,l=o>1?`${s} · ×${o}`:s,d=Math.round(35*Math.pow(1.06,Math.min(t-1,20)))*r,u=[{id:"rapid_fire",icon:Nn.rapid_fire,title:"极速射击",rarity:e,rarityLabel:l,stacksGranted:r,desc:`蒸汽炮射速 +${r*5}%${o>1?` (×${o})`:""}`,currentText:`已叠: +${Math.round(this.getBuffStack("rapid_fire")*5)}%`},{id:"hyper_gene",icon:Nn.hyper_gene,title:"战力强化",rarity:e,rarityLabel:l,stacksGranted:r,desc:`全军生命与战力 +${r*6}%${o>1?` (×${o})`:""}`,currentText:`已叠: +${Math.round(this.getBuffStack("hyper_gene")*6)}%`},{id:"bastion_aegis",icon:Nn.bastion_aegis,title:"基地加固",rarity:e,rarityLabel:l,stacksGranted:r,desc:`我方泡泡站生命 +${r*10}%${o>1?` (×${o})`:""}`,currentText:`已叠: +${Math.round(this.getBuffStack("bastion_aegis")*10)}%`},{id:"nitro_stride",icon:Nn.nitro_stride,title:"急行冲锋",rarity:e,rarityLabel:l,stacksGranted:r,desc:`全军冲锋移速 +${r*4}%${o>1?` (×${o})`:""}`,currentText:`已叠: +${Math.round(Math.min(36,this.getBuffStack("nitro_stride")*4))}%`},{id:"siege_breaker",icon:Nn.siege_breaker,title:"攻城破甲",rarity:e,rarityLabel:l,stacksGranted:r,desc:`拆厂与破锅炉伤害 +${r*10}%${o>1?` (×${o})`:""}`,currentText:`已叠: +${Math.round(this.getBuffStack("siege_breaker")*10)}%`},{id:"titan_reactor",icon:Nn.titan_reactor,title:"极速充能",rarity:e,rarityLabel:l,stacksGranted:r,desc:`大招充能 +${r*7}% · 立即充能 +${Math.min(100,r*10)}%`,currentText:`已叠: +${Math.round(this.getBuffStack("titan_reactor")*7)}%`},{id:"plasma_crit",icon:Nn.plasma_crit,title:"高能暴击",rarity:e,rarityLabel:l,stacksGranted:r,desc:`黄金高能波波率 +${r*10}%${o>1?` (×${o})`:""}`,currentText:`当前触发率: ${Math.round(this.getChargedCritChance()*100)}%`},{id:"split_chamber",icon:Nn.split_chamber,title:"双联齐射",rarity:e,rarityLabel:l,stacksGranted:r,desc:`双联齐射率 +${r*12}%${o>1?` (×${o})`:""}`,currentText:`当前触发率: ${Math.round(this.getExtraCloneChance()*100)}%`},{id:"war_plunder",icon:Nn.war_plunder,title:"赏金掠夺",rarity:e,rarityLabel:l,stacksGranted:r,desc:`赏金 +${r*7}% · 立即获 +${d}金币`,currentText:`已叠: +${Math.round(this.getBuffStack("war_plunder")*7)}%`}];if((e==="epic"||e==="legendary")&&this.getGateBonusAdd()<3){const f=1*o;u.push({id:"gate_resonance",icon:Nn.gate_resonance,title:"倍增强化",rarity:e,rarityLabel:l,stacksGranted:f,desc:`穿过+N横幅额外增援 +${f} 只${o>1?` (×${o})`:""} (最高+3)`,currentText:`当前: +${this.getGateBonusAdd()} 只/次`})}return u}rollStageRewards(t,e=3,n=1){const s=this.rollStageRarity(),a=[...this.getAllRewardDefinitions(t,s,n)],o=[];for(;o.length<e&&a.length>0;){const r=Math.floor(Math.random()*a.length);o.push(a.splice(r,1)[0])}return o}rebuildRewardOptions(t,e,n=1){if(e.length===0)return[];const s=e[0].rarity,a=this.getAllRewardDefinitions(t,s,n);return e.map(o=>a.find(r=>r.id===o.id)||o)}applyRewardBuff(t,e,n="common",s=1){const a=Math.max(1,s);if(t==="gate_resonance"?this.buffStacks[t]=Math.min(3,(this.buffStacks[t]||0)+a):this.buffStacks[t]=(this.buffStacks[t]||0)+a,t==="titan_reactor"){const r=Math.min(100,a*10);this.championCharge=Math.min(100,this.championCharge+r),this.orbitalCharge=Math.min(100,this.orbitalCharge+r)}else if(t==="war_plunder"){const r=Math.round(35*Math.pow(1.06,Math.min(e-1,20)));this.gold+=r*a}this.save();const o=this.getAllRewardDefinitions(e,n);return o.find(r=>r.id===t)||o[0]}creditSkippedStages(t,e){if(!(e<=0)){this.totalMatchesPlayed+=e,this.stagesPlayedSinceRespec+=e,t>this.bestStageCleared&&(this.bestStageCleared=t),this.totalMatchesPlayed<this.bestStageCleared&&(this.totalMatchesPlayed=this.bestStageCleared);for(let n=0;n<e;n++)this.tickStageVictoryDebuffs();this.save(),this.syncRemoteLeaderboard(!1)}}tickStageVictoryDebuffs(){const t=[];for(const e of this.activeDebuffs)e.remainingStages-=1,e.remainingStages<=0&&t.push(e.title);return this.activeDebuffs=this.activeDebuffs.filter(e=>e.remainingStages>0),this.save(),t}applyDefeatPenalty(t){for(const d of this.activeDebuffs)d.remainingStages-=1;this.activeDebuffs=this.activeDebuffs.filter(d=>d.remainingStages>0);const e=Object.keys(this.buffStacks).filter(d=>(this.buffStacks[d]||0)>0);let n=null,s=null;if(e.length>0){const d=e[Math.floor(Math.random()*e.length)],u=this.buffStacks[d]||0;u<=1?delete this.buffStacks[d]:this.buffStacks[d]=u-1;const f=this.getAllRewardDefinitions(t).find(m=>m.id===d);f&&(n=f.title,s=f.icon)}const a=Math.floor(this.gold*.15);this.gold=Math.max(0,this.gold-a),this.championCharge=0,this.orbitalCharge=0;const r={...sd[Math.floor(Math.random()*sd.length)],remainingStages:2},l=this.activeDebuffs.findIndex(d=>d.id===r.id);l>=0?this.activeDebuffs[l].remainingStages=2:this.activeDebuffs.length>=2?(this.activeDebuffs.shift(),this.activeDebuffs.push(r)):this.activeDebuffs.push(r);const c=Math.max(35,Math.round(40+t*15));return this.save(),{lostBuffTitle:n,lostBuffIcon:s,lostGold:a,inflictedDebuff:r,cleanseCost:c}}cleanseAllDebuffs(t){return this.gold<t||this.activeDebuffs.length===0?!1:(this.gold-=t,this.activeDebuffs=[],this.save(),!0)}stackToBadgeRarity(t){return t>=5?"legendary":t>=3?"epic":t>=2?"rare":"common"}getActiveBuffBadges(){const t=[],e=this.getActiveKeystoneSpec();e?t.push({icon:e.branch.icon,text:`${Z.crown} ${e.node.name}`,rarity:"legendary"}):this.getSpentTalentPoints()>0&&t.push({icon:Z.star,text:`天赋×${this.getSpentTalentPoints()}`,rarity:"epic"});const n=this.getBuffStack("rapid_fire");n>0&&t.push({icon:Z.flame,text:`射速+${n*5}%`,rarity:this.stackToBadgeRarity(n)});const s=this.getBuffStack("hyper_gene");s>0&&t.push({icon:Z.sword,text:`基因+${s*6}%`,rarity:this.stackToBadgeRarity(s)});const a=this.getBuffStack("split_chamber");a>0&&t.push({icon:Z.sparkle,text:`分裂${Math.round(this.getExtraCloneChance()*100)}%`,rarity:this.stackToBadgeRarity(a)});const o=this.getGateBonusAdd();o>0&&t.push({icon:Z.arrowUp,text:`门脉+${o}`,rarity:o>=2?"legendary":"epic"});const r=this.getBuffStack("plasma_crit");r>0&&t.push({icon:Z.boom,text:`暴击${Math.round(this.getChargedCritChance()*100)}%`,rarity:this.stackToBadgeRarity(r)});const l=this.getBuffStack("titan_reactor");l>0&&t.push({icon:Z.note,text:`充能+${l*7}%`,rarity:this.stackToBadgeRarity(l)});const c=this.getBuffStack("siege_breaker");c>0&&t.push({icon:Z.gear,text:`破甲+${c*10}%`,rarity:this.stackToBadgeRarity(c)});const d=this.getBuffStack("nitro_stride");d>0&&t.push({icon:Z.rocket,text:`移速+${Math.min(36,d*4)}%`,rarity:this.stackToBadgeRarity(d)});const u=this.getBuffStack("bastion_aegis");u>0&&t.push({icon:Z.shield,text:`基地+${u*10}%`,rarity:this.stackToBadgeRarity(u)});const f=this.getBuffStack("war_plunder");return f>0&&t.push({icon:Z.coin,text:`掠夺+${f*7}%`,rarity:this.stackToBadgeRarity(f)}),t}}const af={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class ea{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const zx=new mc(-1,1,1,-1,0,1);class Fx extends Ue{constructor(){super(),this.setAttribute("position",new pe([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new pe([0,2,0,0,2,0],2))}}const Ox=new Fx;class bc{constructor(t){this._mesh=new F(Ox,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,zx)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}}class of extends ea{constructor(t,e){super(),this.textureID=e!==void 0?e:"tDiffuse",t instanceof Fe?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=Da.clone(t.uniforms),this.material=new Fe({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this.fsQuad=new bc(this.material)}render(t,e,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this.fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this.fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this.fsQuad.render(t))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class ad extends ea{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,n){const s=t.getContext(),a=t.state;a.buffers.color.setMask(!1),a.buffers.depth.setMask(!1),a.buffers.color.setLocked(!0),a.buffers.depth.setLocked(!0);let o,r;this.inverse?(o=0,r=1):(o=1,r=0),a.buffers.stencil.setTest(!0),a.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),a.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),a.buffers.stencil.setClear(r),a.buffers.stencil.setLocked(!0),t.setRenderTarget(n),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),a.buffers.color.setLocked(!1),a.buffers.depth.setLocked(!1),a.buffers.color.setMask(!0),a.buffers.depth.setMask(!0),a.buffers.stencil.setLocked(!1),a.buffers.stencil.setFunc(s.EQUAL,1,4294967295),a.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),a.buffers.stencil.setLocked(!0)}}class Hx extends ea{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}}class Gx{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){const n=t.getSize(new ft);this._width=n.width,this._height=n.height,e=new kn(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ci}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new of(af),this.copyPass.material.blending=li,this.clock=new yx}swapBuffers(){const t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){const e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){t===void 0&&(t=this.clock.getDelta());const e=this.renderer.getRenderTarget();let n=!1;for(let s=0,a=this.passes.length;s<a;s++){const o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,t,n),o.needsSwap){if(n){const r=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(r.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),l.setFunc(r.EQUAL,1,4294967295)}this.swapBuffers()}ad!==void 0&&(o instanceof ad?n=!0:o instanceof Hx&&(n=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){const e=this.renderer.getSize(new ft);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;const n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let a=0;a<this.passes.length;a++)this.passes[a].setSize(n,s)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Vx extends ea{constructor(t,e,n=null,s=null,a=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=a,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Tt}render(t,e,n){const s=t.autoClear;t.autoClear=!1;let a,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(a=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(a),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),t.autoClear=s}}const $x={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Tt(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class Ws extends ea{constructor(t,e,n,s){super(),this.strength=e!==void 0?e:1,this.radius=n,this.threshold=s,this.resolution=t!==void 0?new ft(t.x,t.y):new ft(256,256),this.clearColor=new Tt(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let a=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new kn(a,o,{type:ci}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){const f=new kn(a,o,{type:ci});f.texture.name="UnrealBloomPass.h"+u,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);const m=new kn(a,o,{type:ci});m.texture.name="UnrealBloomPass.v"+u,m.texture.generateMipmaps=!1,this.renderTargetsVertical.push(m),a=Math.round(a/2),o=Math.round(o/2)}const r=$x;this.highPassUniforms=Da.clone(r.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Fe({uniforms:this.highPassUniforms,vertexShader:r.vertexShader,fragmentShader:r.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];a=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new ft(1/a,1/o),a=Math.round(a/2),o=Math.round(o/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new G(1,1,1),new G(1,1,1),new G(1,1,1),new G(1,1,1),new G(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const d=af;this.copyUniforms=Da.clone(d.uniforms),this.blendMaterial=new Fe({uniforms:this.copyUniforms,vertexShader:d.vertexShader,fragmentShader:d.fragmentShader,blending:ka,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Tt,this.oldClearAlpha=1,this.basic=new le,this.fsQuad=new bc(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(t,e){let n=Math.round(t/2),s=Math.round(e/2);this.renderTargetBright.setSize(n,s);for(let a=0;a<this.nMips;a++)this.renderTargetsHorizontal[a].setSize(n,s),this.renderTargetsVertical[a].setSize(n,s),this.separableBlurMaterials[a].uniforms.invSize.value=new ft(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(t,e,n,s,a){t.getClearColor(this._oldClearColor),this.oldClearAlpha=t.getClearAlpha();const o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=n.texture,t.setRenderTarget(null),t.clear(),this.fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this.fsQuad.render(t);let r=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=r.texture,this.separableBlurMaterials[l].uniforms.direction.value=Ws.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[l]),t.clear(),this.fsQuad.render(t),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=Ws.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[l]),t.clear(),this.fsQuad.render(t),r=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this.fsQuad.render(t),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this.fsQuad.render(t)):(t.setRenderTarget(n),this.fsQuad.render(t)),t.setClearColor(this._oldClearColor,this.oldClearAlpha),t.autoClear=o}getSeperableBlurMaterial(t){const e=[];for(let n=0;n<t;n++)e.push(.39894*Math.exp(-.5*n*n/(t*t))/t);return new Fe({defines:{KERNEL_RADIUS:t},uniforms:{colorTexture:{value:null},invSize:{value:new ft(.5,.5)},direction:{value:new ft(.5,.5)},gaussianCoefficients:{value:e}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(t){return new Fe({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}Ws.BlurDirectionX=new ft(1,0);Ws.BlurDirectionY=new ft(0,1);const Wx={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class Xx extends ea{constructor(){super();const t=Wx;this.uniforms=Da.clone(t.uniforms),this.material=new vx({name:t.name,uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader}),this.fsQuad=new bc(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,e,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},de.getTransfer(this._outputColorSpace)===ye&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===pu?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===mu?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===gu?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ic?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===vu?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===xu&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this.fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this.fsQuad.render(t))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class qx extends Xu{constructor(){super();const t=new Nt;t.deleteAttribute("uv");const e=new Ht({side:sn}),n=new Ht,s=new ko(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);const a=new F(t,e);a.position.set(-.757,13.219,.717),a.scale.set(31.713,28.305,28.591),this.add(a);const o=new F(t,n);o.position.set(-10.906,2.009,1.846),o.rotation.set(0,-.195,0),o.scale.set(2.328,7.905,4.651),this.add(o);const r=new F(t,n);r.position.set(-5.607,-.754,-.758),r.rotation.set(0,.994,0),r.scale.set(1.97,1.534,3.955),this.add(r);const l=new F(t,n);l.position.set(6.167,.857,7.803),l.rotation.set(0,.561,0),l.scale.set(3.927,6.285,3.687),this.add(l);const c=new F(t,n);c.position.set(-2.017,.018,6.124),c.rotation.set(0,.333,0),c.scale.set(2.002,4.566,2.064),this.add(c);const d=new F(t,n);d.position.set(2.291,-.756,-2.621),d.rotation.set(0,-.286,0),d.scale.set(1.546,1.552,1.496),this.add(d);const u=new F(t,n);u.position.set(-2.193,-.369,-5.547),u.rotation.set(0,.516,0),u.scale.set(3.875,3.487,2.986),this.add(u);const f=new F(t,As(50));f.position.set(-16.116,14.37,8.208),f.scale.set(.1,2.428,2.739),this.add(f);const m=new F(t,As(50));m.position.set(-16.109,18.021,-8.207),m.scale.set(.1,2.425,2.751),this.add(m);const p=new F(t,As(17));p.position.set(14.904,12.198,-1.832),p.scale.set(.15,4.265,6.331),this.add(p);const S=new F(t,As(43));S.position.set(-.462,8.89,14.52),S.scale.set(4.38,5.441,.088),this.add(S);const g=new F(t,As(20));g.position.set(3.235,11.486,-12.541),g.scale.set(2.5,2,.1),this.add(g);const h=new F(t,As(100));h.position.set(0,20,0),h.scale.set(1,.1,1),this.add(h)}dispose(){const t=new Set;this.traverse(e=>{e.isMesh&&(t.add(e.geometry),t.add(e.material))});for(const e of t)e.dispose()}}function As(i){const t=new le;return t.color.setScalar(i),t}class Kx{constructor(){B(this,"ctx",null);B(this,"enabled",!0);B(this,"lastCloneSoundTime",0);B(this,"clonePitchStep",0);B(this,"bgmTimer",null);B(this,"bgmStep",0);B(this,"bgmDangerLevel",0)}ensureContext(){if(!this.enabled)return null;if(!this.ctx){const t=window.AudioContext||window.webkitAudioContext;t&&(this.ctx=new t)}return this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume().catch(()=>{}),this.ctx&&this.bgmTimer===null&&this.startBgmLoop(),this.ctx}toggle(){return this.enabled=!this.enabled,!this.enabled&&this.bgmTimer!==null?(window.clearInterval(this.bgmTimer),this.bgmTimer=null):this.enabled&&this.ensureContext(),this.enabled}setBgmDanger(t){this.bgmDangerLevel=Math.max(0,Math.min(1,t))}startBgmLoop(){if(this.bgmTimer!==null)return;const t=[73.42,73.42,146.83,73.42,87.31,87.31,110,98],e=[293.66,349.23,440,587.33,523.25,440,349.23,329.63];this.bgmTimer=window.setInterval(()=>{if(!this.enabled||!this.ctx||this.ctx.state!=="running")return;const n=this.ctx.currentTime,s=this.bgmStep%8;this.bgmStep++;const a=this.bgmDangerLevel>.5?1.12246:1,o=this.ctx.createOscillator(),r=this.ctx.createGain();o.type="sawtooth";const l=t[s]*a;o.frequency.setValueAtTime(l,n),o.frequency.exponentialRampToValueAtTime(l*.5,n+.16);const c=this.bgmDangerLevel>.5?.032:.022;if(r.gain.setValueAtTime(c,n),r.gain.exponentialRampToValueAtTime(8e-4,n+.17),o.connect(r),r.connect(this.ctx.destination),o.start(n),o.stop(n+.18),s%2===1||this.bgmDangerLevel>.5){const d=this.ctx.createOscillator(),u=this.ctx.createGain();d.type="triangle";const f=e[s]*a;d.frequency.setValueAtTime(f,n),u.gain.setValueAtTime(this.bgmDangerLevel>.5?.02:.013,n),u.gain.exponentialRampToValueAtTime(8e-4,n+.13),d.connect(u),u.connect(this.ctx.destination),d.start(n),d.stop(n+.14)}},190)}playShoot(t){const e=this.ensureContext();if(!e)return;const n=e.currentTime,s=e.createOscillator(),a=e.createGain();t==="plasma"?(s.type="sawtooth",s.frequency.setValueAtTime(520,n),s.frequency.exponentialRampToValueAtTime(140,n+.085),a.gain.setValueAtTime(.08,n),a.gain.exponentialRampToValueAtTime(.001,n+.09)):t==="twin"?(s.type="triangle",s.frequency.setValueAtTime(420,n),s.frequency.exponentialRampToValueAtTime(160,n+.055),a.gain.setValueAtTime(.06,n),a.gain.exponentialRampToValueAtTime(.001,n+.06)):(s.type="square",s.frequency.setValueAtTime(360,n),s.frequency.exponentialRampToValueAtTime(130,n+.045),a.gain.setValueAtTime(.045,n),a.gain.exponentialRampToValueAtTime(.001,n+.05)),s.connect(a),a.connect(e.destination),s.start(n),s.stop(n+.095)}playCloneGate(t){const e=this.ensureContext();if(!e)return;const n=performance.now();if(n-this.lastCloneSoundTime<38)return;n-this.lastCloneSoundTime>650?this.clonePitchStep=0:this.clonePitchStep=Math.min(18,this.clonePitchStep+1),this.lastCloneSoundTime=n;const s=e.currentTime,a=e.createOscillator(),o=e.createGain(),l=(t>=10?580:440)*Math.pow(1.045,this.clonePitchStep);a.type="sine",a.frequency.setValueAtTime(l,s),a.frequency.exponentialRampToValueAtTime(l*1.35,s+.065),o.gain.setValueAtTime(.075,s),o.gain.exponentialRampToValueAtTime(.001,s+.075),a.connect(o),o.connect(e.destination),a.start(s),a.stop(s+.08)}playChampionSpawn(){const t=this.ensureContext();if(!t)return;const e=t.currentTime,n=t.createOscillator(),s=t.createGain();n.type="sawtooth",n.frequency.setValueAtTime(120,e),n.frequency.exponentialRampToValueAtTime(380,e+.18),n.frequency.exponentialRampToValueAtTime(95,e+.42),s.gain.setValueAtTime(.16,e),s.gain.exponentialRampToValueAtTime(.001,e+.44),n.connect(s),s.connect(t.destination),n.start(e),n.stop(e+.45)}playOrbitalStrike(){const t=this.ensureContext();if(!t)return;const e=t.currentTime,n=t.createOscillator(),s=t.createGain();n.type="sawtooth",n.frequency.setValueAtTime(880,e),n.frequency.exponentialRampToValueAtTime(55,e+.65),s.gain.setValueAtTime(.2,e),s.gain.exponentialRampToValueAtTime(.001,e+.68),n.connect(s),s.connect(t.destination),n.start(e),n.stop(e+.7)}playGearGrind(){const t=this.ensureContext();if(!t)return;const e=t.currentTime,n=t.createOscillator(),s=t.createGain();n.type="sawtooth",n.frequency.setValueAtTime(160,e),n.frequency.linearRampToValueAtTime(90,e+.06),s.gain.setValueAtTime(.07,e),s.gain.exponentialRampToValueAtTime(.001,e+.065),n.connect(s),s.connect(t.destination),n.start(e),n.stop(e+.07)}playExplosion(){const t=this.ensureContext();if(!t)return;const e=t.currentTime,n=t.createOscillator(),s=t.createGain();n.type="triangle",n.frequency.setValueAtTime(180,e),n.frequency.exponentialRampToValueAtTime(38,e+.35),s.gain.setValueAtTime(.22,e),s.gain.exponentialRampToValueAtTime(.001,e+.38),n.connect(s),s.connect(t.destination),n.start(e),n.stop(e+.4)}playUpgrade(){const t=this.ensureContext();if(!t)return;const e=t.currentTime;[523.25,659.25,783.99].forEach((n,s)=>{const a=t.createOscillator(),o=t.createGain();a.type="triangle",a.frequency.setValueAtTime(n,e+s*.055),o.gain.setValueAtTime(.09,e+s*.055),o.gain.exponentialRampToValueAtTime(.001,e+s*.055+.14),a.connect(o),o.connect(t.destination),a.start(e+s*.055),a.stop(e+s*.055+.15)})}playBanelingPop(){const t=this.ensureContext();if(!t)return;const e=t.currentTime,n=t.createOscillator(),s=t.createGain();n.type="sawtooth",n.frequency.setValueAtTime(320,e),n.frequency.exponentialRampToValueAtTime(52,e+.22),s.gain.setValueAtTime(.14,e),s.gain.exponentialRampToValueAtTime(.001,e+.24),n.connect(s),s.connect(t.destination),n.start(e),n.stop(e+.25)}playShamanPulse(){const t=this.ensureContext();if(!t)return;const e=t.currentTime,n=t.createOscillator(),s=t.createGain();n.type="sine",n.frequency.setValueAtTime(392,e),n.frequency.exponentialRampToValueAtTime(587.33,e+.18),s.gain.setValueAtTime(.06,e),s.gain.exponentialRampToValueAtTime(.001,e+.2),n.connect(s),s.connect(t.destination),n.start(e),n.stop(e+.21)}playBossRoar(){const t=this.ensureContext();if(!t)return;const e=t.currentTime;[92,138].forEach(n=>{const s=t.createOscillator(),a=t.createGain();s.type="sawtooth",s.frequency.setValueAtTime(n*1.4,e),s.frequency.exponentialRampToValueAtTime(n*.65,e+.75),a.gain.setValueAtTime(.18,e),a.gain.exponentialRampToValueAtTime(.001,e+.8),s.connect(a),a.connect(t.destination),s.start(e),s.stop(e+.82)})}playKillStreak(){const t=this.ensureContext();if(!t)return;const e=t.currentTime;[440,554.37,659.25,880].forEach((n,s)=>{const a=t.createOscillator(),o=t.createGain();a.type="triangle",a.frequency.setValueAtTime(n,e+s*.05),o.gain.setValueAtTime(.085,e+s*.05),o.gain.exponentialRampToValueAtTime(.001,e+s*.05+.16),a.connect(o),o.connect(t.destination),a.start(e+s*.05),a.stop(e+s*.05+.17)})}playVictoryFanfare(){const t=this.ensureContext();if(!t)return;const e=t.currentTime,n=[523.25,659.25,783.99,1046.5,1318.51];n.forEach((s,a)=>{const o=t.createOscillator(),r=t.createGain();o.type=a===n.length-1?"sawtooth":"triangle";const l=e+a*.085,c=a===n.length-1?.55:.22;o.frequency.setValueAtTime(s,l),r.gain.setValueAtTime(.11,l),r.gain.exponentialRampToValueAtTime(.001,l+c),o.connect(r),r.connect(t.destination),o.start(l),o.stop(l+c+.02)})}}const xt=new Kx;function rf(i,t=6){const e=i.map(x=>new G(x.pos[0],x.pos[1],x.pos[2])),n=new Ku(e),s=Math.max(6,(i.length-1)*3),a=Math.max(5,t),o=a+1,r=(s+1)*o,l=new Float32Array(r*3),c=new Float32Array(r*3),d=[];for(let x=0;x<=s;x++)d.push(n.getPoint(x/s));const u=[];for(let x=0;x<=s;x++){const M=d[Math.max(0,x-1)],N=d[Math.min(s,x+1)].clone().sub(M);N.lengthSq()<1e-8?N.set(0,1,0):N.normalize(),u.push(N)}const f=[],m=[],p=Math.abs(u[0].y)<.9?new G(0,1,0):new G(1,0,0),S=new G().crossVectors(u[0],p).normalize(),g=new G().crossVectors(S,u[0]).normalize();f.push(g),m.push(S);const h=new _e,b=new G;for(let x=1;x<=s;x++){const M=f[x-1].clone();if(b.crossVectors(u[x-1],u[x]),b.lengthSq()>1e-8){b.normalize();const U=Math.acos(Math.max(-1,Math.min(1,u[x-1].dot(u[x]))));M.applyMatrix4(h.makeRotationAxis(b,U))}const _=new G().crossVectors(u[x],M).normalize(),N=new G().crossVectors(_,u[x]).normalize();f.push(N),m.push(_)}const w=i.map(x=>new Tt(x.color)),y=new Tt;let C=0;for(let x=0;x<=s;x++){const _=x/s*(i.length-1),N=Math.min(i.length-2,Math.floor(_)),U=N+1,H=_-N,z=i[N].rx+(i[U].rx-i[N].rx)*H,L=i[N].rz+(i[U].rz-i[N].rz)*H;y.copy(w[N]).lerp(w[U],H);const A=d[x],E=f[x],I=m[x];for(let V=0;V<=a;V++){const $=V/a*Math.PI*2,Q=Math.cos($)*z,it=Math.sin($)*L;l[C*3]=A.x+E.x*Q+I.x*it,l[C*3+1]=A.y+E.y*Q+I.y*it,l[C*3+2]=A.z+E.z*Q+I.z*it,c[C*3]=y.r,c[C*3+1]=y.g,c[C*3+2]=y.b,C++}}const v=[];for(let x=0;x<s;x++)for(let M=0;M<a;M++){const _=x*o+M,N=_+o;v.push(_,N,_+1,N,N+1,_+1)}const T=new Ue;T.setAttribute("position",new Le(l,3)),T.setAttribute("color",new Le(c,3)),T.setIndex(v);const P=T.toNonIndexed();return P.computeVertexNormals(),T.dispose(),P}function Yo(i,t,e,n,s=16777215,a=14411763){const o=i*t,r=i*e,l=i*n,c=new Xt(1,12,9),d=c.index?c.toNonIndexed():c,u=d.attributes.position,f=new Float32Array(u.count*3),m=new Tt(s),p=new Tt(a),S=new Tt;for(let g=0;g<u.count;g++){const h=u.getX(g),b=u.getY(g),w=u.getZ(g),y=b<.2?1+.11*(1-Math.abs(b+.25)):1-.06*Math.pow(Math.max(0,b-.2),1.4),C=b<-.68?-.68+(b+.68)*.45:b;u.setXYZ(g,h*o*y,C*r,w*l*y);const v=Math.max(0,Math.min(1,(b+.95)*.56));S.copy(p).lerp(m,v),f[g*3]=S.r,f[g*3+1]=S.g,f[g*3+2]=S.b}return d.setAttribute("color",new Le(f,3)),d.computeVertexNormals(),d}function Bo(i,t,e=.024,n=.35){const s=i*.5,a=t*.5,o=new Qu;o.moveTo(0,-a),o.quadraticCurveTo(s*(1+n*.4),-a*.15,s*(1-n*.5),a*.72),o.quadraticCurveTo(s*.25,a,0,a),o.quadraticCurveTo(-s*.35,a*.85,-s*(1-n*.25),a*.25),o.quadraticCurveTo(-s*.85,-a*.45,0,-a);const r=Math.min(e*.35,.012),l=new yc(o,{depth:e,bevelEnabled:!0,bevelThickness:r,bevelSize:r,bevelSegments:1,curveSegments:5});l.center();const c=l.index?l.toNonIndexed():l;return c.computeVertexNormals(),c}function at(i,t,e,n=0,s=0){const a=i.index?i.toNonIndexed():i.clone();return a.computeVertexNormals(),{geo:a,color:t,partId:e,glowWeight:n,tintMask:s}}function _n(i){let t=0;for(const u of i)t+=u.geo.attributes.position.count;const e=new Float32Array(t*3),n=new Float32Array(t*3),s=new Float32Array(t*3),a=new Float32Array(t*2),o=new Float32Array(t),r=new Float32Array(t),l=new Tt;let c=0;for(const u of i){const f=u.geo.attributes.position,m=u.geo.attributes.normal,p=u.geo.attributes.color,S=f.count;l.setHex(u.color);const g=1+(u.glowWeight||0)*.24,h=u.tintMask??0;for(let b=0;b<S;b++){const w=(c+b)*3,y=(c+b)*2,C=f.getX(b),v=f.getY(b),T=f.getZ(b);e[w]=C,e[w+1]=v,e[w+2]=T,n[w]=m?m.getX(b):0,n[w+1]=m?m.getY(b):1,n[w+2]=m?m.getZ(b):0;const P=p?p.getX(b):l.r,x=p?p.getY(b):l.g,M=p?p.getZ(b):l.b;s[w]=P*g,s[w+1]=x*g,s[w+2]=M*g,a[y]=(C+T)*1.6,a[y+1]=v*1.6,o[c+b]=u.partId,r[c+b]=h}c+=S,u.geo.dispose()}const d=new Ue;return d.setAttribute("position",new Le(e,3)),d.setAttribute("normal",new Le(n,3)),d.setAttribute("color",new Le(s,3)),d.setAttribute("uv",new Le(a,2)),d.setAttribute("aPartId",new Le(o,1)),d.setAttribute("aTintMask",new Le(r,1)),d}function Rs(i){const t=i.shoulderY??.45,e=i.hipY??.18,n=new Tt(i.rimColor??16777215),s=new Ht({vertexColors:!0,roughness:i.roughness??.22,metalness:i.metalness??.06,emissive:i.emissive??1054752,emissiveIntensity:i.emissiveIntensity??.08,envMapIntensity:0});return s.onBeforeCompile=a=>{a.vertexShader=`
      attribute float aPartId;
      attribute float aTintMask;
      attribute vec4 aAnim;
      varying float vFlash;
      varying float vHeight;
      varying float vTintMask;

      vec3 rotateX(vec3 p, float a) {
        float s = sin(a);
        float c = cos(a);
        return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
      }

      vec3 rotateY(vec3 p, float a) {
        float s = sin(a);
        float c = cos(a);
        return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
      }

      vec3 rotateZ(vec3 p, float a) {
        float s = sin(a);
        float c = cos(a);
        return vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
      }
      `+a.vertexShader,a.vertexShader=a.vertexShader.replace("#include <color_vertex>",`
      #include <color_vertex>
      vTintMask = aTintMask;
      #if defined( USE_COLOR ) && defined( USE_INSTANCING_COLOR )
        vColor.xyz = mix( color.xyz, color.xyz * instanceColor.xyz, aTintMask );
      #endif
      `),a.vertexShader=a.vertexShader.replace("#include <begin_vertex>",`
      #include <begin_vertex>
      float walkPhase = aAnim.x;
      float speedAmt = clamp(aAnim.y, 0.0, 1.4);
      float atk = clamp(aAnim.z, 0.0, 1.0);
      vFlash = aAnim.w;

      float stride = sin(walkPhase) * 0.78 * speedAmt;
      float bounce = abs(sin(walkPhase)) * 0.105 * speedAmt;
      float jellySquash = sin(walkPhase * 2.0) * 0.045 * speedAmt;
      float atkSwing = sin(atk * 3.14159265);
      float wingFlap = sin(walkPhase * 1.7) * 0.34 * max(0.35, speedAmt) + atkSwing * 0.42;

      if (aPartId > 3.5 && aPartId < 4.5) {
        vec3 local = transformed - vec3(-0.14, ${e.toFixed(2)}, 0.0);
        local = rotateX(local, stride);
        transformed = local + vec3(-0.14, ${e.toFixed(2)}, 0.0);
      } else if (aPartId > 4.5 && aPartId < 5.5) {
        vec3 local = transformed - vec3(0.14, ${e.toFixed(2)}, 0.0);
        local = rotateX(local, -stride);
        transformed = local + vec3(0.14, ${e.toFixed(2)}, 0.0);
      } else if (aPartId > 5.5 && aPartId < 6.5) {
        vec3 pivot = vec3(-0.16, ${(t+.08).toFixed(2)}, -0.16);
        vec3 local = transformed - pivot;
        local = rotateY(local, wingFlap);
        local = rotateZ(local, wingFlap * 0.42);
        transformed = local + pivot;
      } else if (aPartId > 6.5) {
        vec3 pivot = vec3(0.16, ${(t+.08).toFixed(2)}, -0.16);
        vec3 local = transformed - pivot;
        local = rotateY(local, -wingFlap);
        local = rotateZ(local, -wingFlap * 0.42);
        transformed = local + pivot;
      } else if (aPartId > 1.5 && aPartId < 2.5) {
        vec3 local = transformed - vec3(-0.28, ${t.toFixed(2)}, 0.0);
        local = rotateX(local, -stride * 0.72 - atkSwing * 0.55);
        local = rotateZ(local, sin(walkPhase) * 0.18 * speedAmt);
        transformed = local + vec3(-0.28, ${t.toFixed(2)}, 0.0);
      } else if (aPartId > 2.5 && aPartId < 3.5) {
        vec3 local = transformed - vec3(0.28, ${t.toFixed(2)}, 0.0);
        local = rotateX(local, stride * 0.72 - atkSwing * 1.35);
        local = rotateZ(local, -sin(walkPhase) * 0.18 * speedAmt);
        transformed = local + vec3(0.28, ${t.toFixed(2)}, 0.0);
      } else if (aPartId > 0.5 && aPartId < 1.5) {
        vec3 local = transformed - vec3(0.0, ${(t+.12).toFixed(2)}, 0.0);
        local = rotateY(local, cos(walkPhase) * 0.1 * speedAmt);
        transformed = local + vec3(0.0, ${(t+.12).toFixed(2)}, 0.0);
      }

      // Soft Q-elastic jelly squash & stretch on body + vertical cheer bounce
      if (aPartId < 3.5 || aPartId > 5.5) {
        if (aTintMask > 0.5 && aPartId < 1.5) {
          transformed.x *= (1.0 - jellySquash * 0.65);
          transformed.z *= (1.0 - jellySquash * 0.65);
          transformed.y *= (1.0 + jellySquash * 0.85);
        }
        transformed.y += bounce;
        transformed.z += atkSwing * 0.16;
      }
      vHeight = clamp(transformed.y, 0.0, 2.2);
      `),a.fragmentShader=`
      varying float vFlash;
      varying float vHeight;
      varying float vTintMask;
      `+a.fragmentShader,a.fragmentShader=a.fragmentShader.replace("#include <emissivemap_fragment>",`
      #include <emissivemap_fragment>
      diffuseColor.rgb *= mix(0.82, 1.0, smoothstep(0.02, 0.52, vHeight));
      `),a.fragmentShader=a.fragmentShader.replace("#include <lights_physical_fragment>","").replace("#include <lights_fragment_begin>","").replace("#include <lights_fragment_maps>","").replace("#include <lights_fragment_end>",""),a.fragmentShader=a.fragmentShader.replace("#include <dithering_fragment>",`
      // === TRUE 2D CEL-TOON / MATCAP ILLUSTRATION SHADING FOR UNITS ===
      vec3 viewDir2D = normalize(vViewPosition);
      vec3 viewN2D = normalize(normal);
      float ndv2D = abs(dot(viewN2D, viewDir2D));

      // 1. 2-Step Warm Cel-Toon Lighting (Zero dark/muddy 3D PBR shadows!)
      vec3 toonLightDir = normalize(vec3(-0.36, 0.74, 0.56));
      float ndl2D = dot(viewN2D, toonLightDir);
      float celBand = mix(0.80, 1.06, smoothstep(-0.10, 0.15, ndl2D));
      vec3 shadowWarmth = mix(vec3(0.95, 0.84, 0.78), vec3(1.0, 1.0, 1.0), smoothstep(-0.10, 0.15, ndl2D));
      vec3 toonCol = diffuseColor.rgb * shadowWarmth * celBand;

      // 2. Soft Translucent Jelly Rim Glow + Hit/Charge Flash
      float fresnel2D = pow(1.0 - ndv2D, 2.4);
      vec3 rimGlow2D = vec3(${n.r.toFixed(3)}, ${n.g.toFixed(3)}, ${n.b.toFixed(3)}) * (fresnel2D * (0.14 + vTintMask * 0.16));
      vec3 flashGlow2D = vec3(1.0, 0.88, 0.42) * clamp(vFlash, 0.0, 0.65) * 0.45;
      toonCol += rimGlow2D + flashGlow2D;

      // 3. Iconic Supercell Vinyl-Toy Dual Specular Catchlights on Jelly Slimes (vTintMask > 0.5)
      if (vTintMask > 0.5 && viewN2D.z > 0.12) {
        vec2 catchUV = (viewN2D.xy - vec2(-0.31, 0.36)) * vec2(0.95, 1.32);
        float catchDot = 1.0 - smoothstep(0.14, 0.21, length(catchUV));
        vec2 subCatchUV = (viewN2D.xy - vec2(-0.14, 0.51)) * vec2(1.4, 1.6);
        float subCatchDot = 1.0 - smoothstep(0.06, 0.11, length(subCatchUV));
        float vinylGloss = max(catchDot, subCatchDot * 0.85);
        toonCol = mix(toonCol, vec3(1.0, 1.0, 1.0), vinylGloss * 0.96);
      } else {
        // Crisp 2D cartoon specular band for crowns, helmets, goggles & weapons
        float hardSpec = smoothstep(0.82, 0.89, max(0.0, dot(viewN2D, toonLightDir))) * 0.30;
        toonCol += vec3(hardSpec);
      }

      // 4. Crisp Supercell Vinyl-Toy Dark-Espresso Cartoon Silhouette Ink Outline (#1e110a)
      float inkEdge = 1.0 - smoothstep(0.24, 0.36, ndv2D);
      toonCol = mix(toonCol, vec3(0.118, 0.067, 0.039), inkEdge * 0.94);

      gl_FragColor = vec4(toonCol, diffuseColor.a);
      #include <dithering_fragment>
      `)},s}const lf={primary:2475256,secondary:1221851,dark:2896704,accent:6806783,glow:16743110,emissive:664886};function $i(i,t=1,e=!0,n=!0,s=16777215){for(const[r,l]of[[-1,4],[1,5]]){const c=new Xt(.098*t,7,5);c.scale(1.08,.66,1.25),c.translate(r*.148*t,.065*t,.03),i.push(at(c,15660540,l,0,1))}const a=Yo(.33*t,1.1,.95,1.05,16777215,14215416);if(a.translate(0,.37*t,0),i.push(at(a,16777215,0,0,1)),e){const r=rf([{pos:[0,.62*t,0],rx:.115*t,rz:.115*t,color:16777215},{pos:[-.015,.73*t,.01],rx:.058*t,rz:.058*t,color:16777215},{pos:[-.035,.82*t,.02],rx:.012*t,rz:.012*t,color:16777215}],5);i.push(at(r,16777215,1,0,1))}if(n){const r=new ie(.296*t,.054*t,6,14);r.rotateX(Math.PI/2+.08),r.scale(1.08,1,1.05),r.translate(0,.52*t,.01*t),i.push(at(r,s,1,.25,0));const l=new Xt(.066*t,6,5);l.translate(.26*t,.55*t,.12*t),i.push(at(l,s,1,.25,0));for(const[c,d,u]of[[-.48,.34,.66],[-.96,.37,.56]]){const f=Bo(.084*t,.23*t,.024,.25);f.rotateZ(c),f.rotateY(.22),f.translate(d*t,u*t,.1*t),i.push(at(f,s,1,.25,0))}}for(const r of[-1,1]){const l=new Xt(.052*t,7,5);l.scale(.88,1.22,.55),l.translate(r*.118*t,.405*t,.332*t),i.push(at(l,1971744,1,0,0));const c=new Xt(.022*t,5,4);c.translate((r*.118-.014)*t,.432*t,.356*t),i.push(at(c,16777215,1,.8,0));const d=new Xt(.056*t,6,5);d.scale(1.3,.68,.4),d.translate(r*.205*t,.345*t,.308*t),i.push(at(d,16739990,1,.35,0))}const o=new ie(.036*t,.013*t,4,7,Math.PI);o.rotateZ(Math.PI),o.translate(0,.365*t,.342*t),i.push(at(o,2692380,1,0,0));for(const[r,l]of[[-1,2],[1,3]]){const c=new Xt(.086*t,7,5);c.scale(.95,.95,1.15),c.translate(r*.34*t,.38*t,.08),i.push(at(c,15923455,l,0,1))}}function bi(i,t,e,n,s=1){const a=t*.37*s,o=-t*.34,r=.28,l=new lt(.022*s,.024*s,.11*s,6);l.rotateZ(o),l.rotateX(r),l.translate(a,.4*s,.07*s),i.push(at(l,3878200,e,0,0));const c=new We(.033*s,.24*s,3,6);c.rotateZ(o),c.rotateX(r),c.translate(a+t*.055*s,.55*s,.12*s),i.push(at(c,n,e,1,0));const d=new We(.018*s,.2*s,3,5);d.rotateZ(o),d.rotateX(r),d.translate(a+t*.055*s,.55*s,.12*s),i.push(at(d,16777215,e,1,0))}function od(i=lf,t="swarm"){const e=[];if(t==="swarm"){$i(e,1,!0,!0,15680580),bi(e,-1,2,16739014,1),bi(e,1,3,16769126,1);for(const[s,a]of[[-1,6],[1,7]]){const o=Bo(.11,.24,.018,.3);o.rotateY(Math.PI/2),o.rotateZ(-s*.65),o.translate(s*.16,.45,-.25),e.push(at(o,16773367,a,.35,0))}return _n(e)}if(t==="titan"){$i(e,1.08,!1,!1);const s=new Xt(.29,14,10,0,Math.PI*2,0,Math.PI*.5);s.scale(1.14,.74,1.1),s.translate(0,.54,0),e.push(at(s,7023890,1,.12,0));const a=new lt(.155,.135,.095,10);a.translate(0,.74,0),e.push(at(a,16436245,1,.45,0));for(let c=0;c<5;c++){const d=c/5*Math.PI*2,u=new Ie(.042,.09,5);u.translate(Math.sin(d)*.125,.82,Math.cos(d)*.125),e.push(at(u,16638023,1,.55,0))}const o=new ss(.044,0);o.translate(0,.75,.145),e.push(at(o,15680580,1,.65,0)),bi(e,-1,2,16745928,1);const r=new lt(.028,.03,.48,7);r.rotateX(Math.PI/3),r.translate(.38,.5,.18),e.push(at(r,13141062,3,0,0));const l=new lt(.135,.135,.28,12);l.rotateZ(Math.PI/2),l.translate(.38,.64,.34),e.push(at(l,16170286,3,.45,0));for(const c of[-1,1]){const d=new lt(.142,.142,.036,12);d.rotateZ(Math.PI/2),d.translate(.38+c*.14,.64,.34),e.push(at(d,10112540,3,.2,0))}return _n(e)}if(t==="gate"){$i(e,1,!1,!0);for(const r of[-1,1]){const l=new We(.062,.24,5,8);l.scale(1,1,.58),l.rotateZ(-r*.22),l.translate(r*.13,.78,-.02),e.push(at(l,16777215,1,0,1));const c=new We(.036,.17,4,6);c.scale(1,1,.35),c.rotateZ(-r*.22),c.translate(r*.13,.78,.015),e.push(at(c,16752315,1,.25,0))}const s=new ie(.24,.024,6,16);s.translate(0,.62,-.26),e.push(at(s,16769126,6,.9,0)),bi(e,-1,2,16740552,1);const a=new lt(.02,.022,.42,7);a.rotateX(.35),a.rotateZ(-.25),a.translate(.39,.52,.12),e.push(at(a,16774614,3,.2,0));const o=new ss(.095,0);return o.scale(1.15,1.15,.55),o.translate(.44,.7,.19),e.push(at(o,16768845,3,1,0)),_n(e)}if(t==="plasma"){$i(e,1,!1,!0);for(const a of[-1,1]){const o=new Ie(.095,.19,4);o.rotateY(Math.PI/4),o.rotateZ(-a*.35),o.translate(a*.19,.7,0),e.push(at(o,16777215,1,0,1));const r=new lt(.085,.085,.07,12);r.rotateZ(Math.PI/2),r.translate(a*.31,.49,0),e.push(at(r,2830136,1,0,0));const l=new lt(.06,.06,.08,10);l.rotateZ(Math.PI/2),l.translate(a*.315,.49,0),e.push(at(l,16237361,1,.65,0))}const s=new ie(.305,.026,7,18,Math.PI);s.translate(0,.49,0),e.push(at(s,2830136,1,0,0));for(const[a,o]of[[-1,6],[1,7]]){const r=new ie(.11,.022,6,12);r.translate(a*.16,.56,-.26),e.push(at(r,16769095,o,.95,0))}return bi(e,-1,2,16769095,1.05),bi(e,1,3,4580351,1.05),_n(e)}if(t==="orbital"){$i(e,1,!1,!0);const s=new lt(.15,.15,.03,12);s.rotateZ(-.15),s.translate(.05,.68,0),e.push(at(s,5979020,1,0,0));const a=new lt(.105,.095,.15,12);a.rotateZ(-.15),a.translate(.07,.76,0),e.push(at(a,8146431,1,.2,0));const o=new lt(.102,.1,.04,12);o.rotateZ(-.15),o.translate(.06,.71,0),e.push(at(o,16237361,1,.5,0));for(const[c,d]of[[-1,6],[1,7]])for(const[u,f,m]of[[.18,.52,.095],[.29,.58,.105],[.37,.5,.08]]){const p=new Xt(m,8,8);p.scale(1.1,.9,.65),p.translate(c*u,f,-.24),e.push(at(p,16777215,d,.3,0))}bi(e,-1,2,16740560,1);const r=new lt(.022,.022,.36,7);r.rotateX(.32),r.rotateZ(-.25),r.translate(.38,.5,.12),e.push(at(r,14196274,3,.3,0));const l=new Xt(.072,10,10);return l.translate(.43,.67,.18),e.push(at(l,16769126,3,.85,0)),_n(e)}if(t==="bastion"){$i(e,1.02,!1,!0,16436245);const s=new lt(.17,.21,.12,10);s.translate(0,.68,0),e.push(at(s,16436245,1,.4,0));const a=new Nt(.06,.14,.22);a.translate(0,.78,-.02),e.push(at(a,15680580,1,.45,0));for(const[c,d]of[[-1,6],[1,7]]){const u=new lt(.016,.016,.48,6);u.translate(c*.15,.66,-.24),e.push(at(u,14196274,d,.2,0));const f=new Nt(.02,.22,.17);f.translate(c*.15,.78,-.32),e.push(at(f,16020118,d,.45,0))}const o=new lt(.205,.205,.055,12);o.rotateX(Math.PI/2),o.rotateY(.32),o.translate(-.36,.39,.16),e.push(at(o,16436245,2,.45,0));const r=new lt(.155,.155,.065,14);r.rotateX(Math.PI/2),r.rotateY(.32),r.translate(-.36,.39,.168),e.push(at(r,14256700,2,.15,0));const l=new Ie(.068,.5,8);return l.rotateX(Math.PI/2),l.translate(.37,.41,.26),e.push(at(l,16739211,3,.65,0)),_n(e)}$i(e,1,!1,!0);for(const s of[-1,1]){const a=rf([{pos:[s*.14,.62,.02],rx:.052,rz:.052,color:14196274},{pos:[s*.2,.75,-.03],rx:.034,rz:.034,color:16766011},{pos:[s*.23,.85,-.08],rx:.008,rz:.008,color:16774079}],6);e.push(at(a,16766011,1,.65,0))}for(const[s,a]of[[-1,6],[1,7]]){const o=new lt(.14,.14,.03,12);o.rotateX(Math.PI/2),o.rotateY(s*.42),o.translate(s*.24,.52,-.24),e.push(at(o,16764723,a,.75,0))}bi(e,-1,2,16769126,1);const n=new lt(.08,.06,.38,10);return n.rotateX(Math.PI/2),n.translate(.37,.42,.22),e.push(at(n,16103207,3,.65,0)),_n(e)}function rd(i=lf,t="swarm"){const e=[];for(const[p,S]of[[-1,4],[1,5]]){const g=new We(.16,.24,6,10);g.translate(p*.26,.22,.02),e.push(at(g,16775403,S,.1,0));const h=new Nt(.32,.12,.42);h.translate(p*.26,.06,.05),e.push(at(h,14196274,S,.3,0))}const n=t==="tycoon"?16234289:t==="titan"?16097090:i.primary,s=Yo(.68,1.08,.96,1.04,n,i.secondary);s.translate(0,.88,0),e.push(at(s,n,0,.15,0));const a=new ie(.61,.085,8,24);a.rotateX(Math.PI/2+.06),a.scale(1.07,1,1.04),a.translate(0,1.18,0),e.push(at(a,16777215,1,.25,0));const o=new lt(.28,.24,.18,12);o.translate(0,1.56,0),e.push(at(o,16237361,1,.65,0));for(const p of[-1,0,1]){const S=new ss(.09,0);S.translate(p*.16,1.7,.08),e.push(at(S,p===0?16735400:16769126,1,1,0))}for(const p of[-1,1]){const S=new lt(.18,.18,.14,14);S.rotateZ(Math.PI/2),S.translate(p*.68,1.08,0),e.push(at(S,2961722,1,0,0));const g=new lt(.13,.13,.16,12);g.rotateZ(Math.PI/2),g.translate(p*.69,1.08,0),e.push(at(g,16237361,1,.7,0));const h=new Xt(.085,10,10);h.scale(.88,1.2,.55),h.translate(p*.24,.98,.67),e.push(at(h,1975344,1,0,0));const b=new Xt(.09,8,8);b.scale(1.3,.65,.4),b.translate(p*.39,.85,.62),e.push(at(b,16741783,1,.3,0))}for(const[p,S]of[[-1,6],[1,7]]){const g=Bo(.36,.95,.05,.35);g.rotateY(Math.PI/2+p*.25),g.rotateZ(-p*.52),g.translate(p*.52,1.12,-.52),e.push(at(g,16740536,S,.85,0));const h=Bo(.24,.72,.04,.35);h.rotateY(Math.PI/2+p*.28),h.rotateZ(-p*.75),h.translate(p*.62,.95,-.55),e.push(at(h,16769126,S,.95,0))}const r=new Xt(.18,10,10);r.translate(-.74,.88,.14),e.push(at(r,n,2,.1,0));const l=new lt(.38,.38,.1,16);l.rotateZ(Math.PI/2),l.translate(-.88,.92,.26),e.push(at(l,16237361,2,.6,0));const c=new Xt(.24,12,10);c.scale(.45,1,1),c.translate(-.92,.92,.26),e.push(at(c,16739014,2,.95,0));const d=new Xt(.18,10,10);d.translate(.74,.88,.16),e.push(at(d,n,3,.1,0));const u=new lt(.065,.065,1.28,10);u.rotateX(Math.PI/3),u.translate(.74,.98,.54),e.push(at(u,14196274,3,.4,0));const f=new lt(.26,.2,.32,14);f.rotateZ(Math.PI/2),f.translate(.58,1.26,.98),e.push(at(f,16739014,3,1,0));const m=new lt(.2,.28,.34,14);return m.rotateZ(Math.PI/2),m.translate(.9,1.26,.98),e.push(at(m,16237361,3,.85,0)),_n(e)}function Yx(){const i=[];for(const[S,g]of[[-1,4],[1,5]]){const h=new We(.082,.16,4,8);h.translate(S*.125,.24,0),i.push(at(h,3817031,g));const b=new Nt(.15,.12,.23);b.translate(S*.125,.06,.035),i.push(at(b,2500912,g))}const t=Yo(.25,1.02,.98,.92,13914690,10696233);t.translate(0,.52,0),i.push(at(t,13125946,0));const e=new lt(.245,.25,.075,12);e.translate(0,.44,0),i.push(at(e,2829878,0));const n=new Nt(.09,.075,.04);n.translate(0,.44,.24),i.push(at(n,14854200,0,.35));const s=new We(.105,.22,5,8);s.translate(0,.58,-.24),i.push(at(s,12073004,0));const a=new lt(.05,.05,.06,8);a.translate(0,.76,-.24),i.push(at(a,14196274,0,.3));const o=new Xt(.21,8,6);o.translate(0,.86,.02),i.push(at(o,2895928,1));for(const S of[-1,1]){const g=new lt(.072,.072,.06,8);g.rotateX(Math.PI/2),g.translate(S*.082,.85,.2),i.push(at(g,16317180,1,.35));const h=new lt(.048,.048,.068,7);h.rotateX(Math.PI/2),h.translate(S*.082,.85,.205),i.push(at(h,1974825,1))}const r=new Xt(.245,9,6,0,Math.PI*2,0,Math.PI*.56);r.scale(1.06,.96,1.08),r.translate(0,.9,.01),i.push(at(r,4738391,1));const l=new ie(.245,.028,5,12);l.rotateX(Math.PI/2-.06),l.scale(1.06,1.08,1),l.translate(0,.91,.015),i.push(at(l,3882823,1));const c=new ss(.055,0);c.scale(1.15,1.15,.45),c.translate(0,1.01,.24),i.push(at(c,16726855,1,.75));const d=new We(.068,.2,3,6);d.rotateX(.45),d.translate(-.26,.54,.08),i.push(at(d,12074544,2));const u=new We(.068,.2,3,6);u.rotateX(.55),u.translate(.26,.54,.1),i.push(at(u,12074544,3));const f=new lt(.024,.026,.86,6);f.rotateX(Math.PI/2.8),f.rotateZ(-.35),f.translate(.32,.56,.28),i.push(at(f,4863269,3));const m=new ie(.21,.022,5,10);m.rotateY(.35),m.rotateX(.45),m.translate(.48,.78,.58),i.push(at(m,14410476,3,.25));const p=new Ie(.205,.36,7,1,!0);return p.rotateX(-1.1),p.rotateZ(.25),p.translate(.51,.72,.44),i.push(at(p,15857145,3,.25)),_n(i)}function Zx(){const i=[];for(const[l,c]of[[-1,4],[1,5]]){const d=new We(.17,.32,6,10);d.translate(l*.26,.36,0),i.push(at(d,8144427,c));const u=new Nt(.28,.22,.36);u.translate(l*.26,.12,.04),i.push(at(u,3488066,c))}const t=Yo(.56,1.18,1.08,.96,15231810,11879460);t.translate(0,1.04,0),i.push(at(t,14245688,0));const e=new Nt(.76,.2,.56);e.translate(0,1.08,.16),i.push(at(e,7028262,0));const n=new Nt(.36,.26,.14);n.translate(0,1.08,.42),i.push(at(n,14196274,0,.35));for(const l of[-1,1]){const c=new We(.18,.48,6,10);c.translate(l*.24,1.18,-.44),i.push(at(c,12860463,0))}const s=new Xt(.33,14,12);s.scale(1.06,.98,1.05),s.translate(0,1.66,.1),i.push(at(s,4080461,1));const a=new Nt(.46,.18,.32);a.translate(0,1.54,.22),i.push(at(a,2961720,1));for(const l of[-1,1]){const c=new lt(.075,.075,.08,10);c.rotateX(Math.PI/2),c.translate(l*.12,1.68,.39),i.push(at(c,16769126,1,1))}for(const[l,c]of[[-1,2],[1,3]]){const d=new Xt(.26,10,10);d.translate(l*.62,1.32,.04),i.push(at(d,14245688,c));const u=new We(.17,.44,6,10);u.rotateX(.42),u.translate(l*.64,.96,.16),i.push(at(u,12865323,c))}const o=new Nt(.12,.14,1.05);o.rotateX(-.35),o.translate(.64,.96,.56),i.push(at(o,12109012,3,.2));const r=new ie(.24,.085,8,14,Math.PI*1.45);return r.rotateY(Math.PI/2),r.translate(.64,1.18,1.05),i.push(at(r,14410992,3,.35)),_n(i)}function jx(){const i=[];for(const[o,r]of[[-1,4],[1,5]]){const l=new We(.072,.16,4,8);l.translate(o*.13,.2,0),i.push(at(l,3488066,r))}const t=new Xt(.29,12,12);t.scale(1.08,1.02,1.08),t.translate(0,.52,0),i.push(at(t,15035192,0,.25));const e=new ie(.295,.032,7,16);e.rotateX(Math.PI/2),e.translate(0,.52,0),i.push(at(e,14196274,0,.4));const n=new lt(.14,.14,.1,12);n.rotateX(Math.PI/2),n.translate(0,.54,.26),i.push(at(n,16769126,1,1));const s=new lt(.06,.08,.18,10);s.translate(0,.86,0),i.push(at(s,16237361,1,.6));const a=new lt(.025,.025,.18,6);a.rotateX(Math.PI/2),a.translate(0,.58,-.34),i.push(at(a,16237361,6,.5));for(const o of[-1,1]){const r=new ie(.085,.024,6,12);r.translate(o*.09,.58,-.42),i.push(at(r,16237361,6,.6))}return _n(i)}function Jx(){const i=[];for(const[f,m]of[[-1,4],[1,5]]){const p=new We(.08,.24,4,8);p.translate(f*.12,.28,0),i.push(at(p,3483960,m))}const t=new Ie(.33,.68,12);t.translate(0,.62,0),i.push(at(t,10039099,0));const e=new Nt(.58,.12,.26);e.translate(0,.9,0),i.push(at(e,14196274,0,.4));const n=new Xt(.2,10,10);n.translate(0,1.08,.03),i.push(at(n,3093309,1));const s=new Nt(.25,.08,.14);s.translate(0,1.1,.18),i.push(at(s,16769126,1,1));const a=new lt(.28,.28,.04,14);a.translate(0,1.24,.02),i.push(at(a,2829878,1));const o=new lt(.19,.17,.3,14);o.translate(0,1.4,.02),i.push(at(o,3685446,1));const r=new lt(.182,.178,.07,14);r.translate(0,1.3,.02),i.push(at(r,14196274,1,.5));const l=new We(.065,.24,4,8);l.rotateX(.45),l.translate(-.28,.76,.1),i.push(at(l,10039099,2));const c=new We(.065,.24,4,8);c.rotateX(.5),c.translate(.28,.76,.12),i.push(at(c,10039099,3));const d=new lt(.035,.04,1.24,8);d.rotateX(.22),d.translate(.3,.84,.26),i.push(at(d,14196274,3,.35));const u=new Ie(.22,.38,12,1,!0);return u.rotateX(-Math.PI/2+.22),u.translate(.3,1.42,.48),i.push(at(u,16237361,3,.85)),_n(i)}const Qe=2600,pa=1800,Fr=72,Or=36,ue=11.2,wt=18.8,Mt=-17.2;class Qx{constructor(t,e,n){B(this,"canvas");B(this,"labelsContainer");B(this,"state");B(this,"renderer");B(this,"composer");B(this,"bloomPass");B(this,"cinemaPass");B(this,"scene");B(this,"camera");B(this,"combatLights",[]);B(this,"starfieldPoints");B(this,"godRayMats",[]);B(this,"cameraMode",0);B(this,"baseCameraPos",new G(0,31.5,29.5));B(this,"cameraShake",0);B(this,"quakeTimer",0);B(this,"quakeMaxTimer",0);B(this,"quakeIntensity",0);B(this,"skillWaveQueue",[]);B(this,"skillOverdriveTimer",0);B(this,"scorchedEarthTimer",0);B(this,"scorchedEarthTickTimer",0);B(this,"shotsFiredCounter",0);B(this,"praetorianShotCounter",0);B(this,"baseTurretTimer",0);B(this,"baseRegenTimer",0);B(this,"swarmBroodTimer",4.5);B(this,"gatePulseTimer",3.2);B(this,"plasmaThunderTimer",2.8);B(this,"orbitalStarfallTimer",3.6);B(this,"bastionPeriodicWaveTimer",9.5);B(this,"lastKnownBaseHp",0);B(this,"baseDamageAccum",0);B(this,"bastionShockwavesTriggered",0);B(this,"tycoonGoldMilestone",180);B(this,"turretGroup",new re);B(this,"mascotGroup",new re);B(this,"mascotLeftArm");B(this,"turretGaugeNeedle");B(this,"turretGroundRingMat");B(this,"turretBodyMat");B(this,"turretDomeMat");B(this,"turretBarrelMat");B(this,"turretBarrel");B(this,"turretMuzzleLight");B(this,"turretEvo1Group",new re);B(this,"turretEvo2Group",new re);B(this,"turretEvoHalo");B(this,"currentTurretEvoTier",0);B(this,"mascotCheerBoost",0);B(this,"candySkyBlue",new Tt(2672634));B(this,"candyAppleGreen",new Tt(8120379));B(this,"candyCoralPink",new Tt(16346752));B(this,"candyGold",new Tt(16763187));B(this,"candyAmber",new Tt(16750638));B(this,"skinCandyTints",[new Tt(2672634),new Tt(8120379),new Tt(16346752)]);B(this,"turretX",-7.8);B(this,"turretTargetX",-7.8);B(this,"turretRecoil",0);B(this,"wasHoldingFire",!1);B(this,"heroChargeFullNotified",!1);B(this,"holdChargeParticleTimer",0);B(this,"turretChargeEl");B(this,"turretChargeFillEl");B(this,"turretChargeTextEl");B(this,"lootBugGroup",new re);B(this,"lootBugLabelEl");B(this,"lootBug",{active:!1,x:0,z:0,dirX:1,hp:8,maxHp:8,spawnTimer:7,hitFlash:0});B(this,"bossGroup",new re);B(this,"bossHead");B(this,"megaBossCrownGroup",new re);B(this,"megaBossHalo");B(this,"bossPortalMat");B(this,"bossPortalRing");B(this,"bossPortalRingMat");B(this,"bossShieldMesh");B(this,"bossHitFlash",0);B(this,"bossShieldActive",!1);B(this,"bossShieldHitsRemaining",0);B(this,"bossShield70Triggered",!1);B(this,"bossShield50Triggered",!1);B(this,"bossShield35Triggered",!1);B(this,"megaBossMeteorTimer",5.5);B(this,"megaBossCurseTimer",11);B(this,"megaBossSlamTimer",8.8);B(this,"miniBossWarCryTimer",7.2);B(this,"meteorTelegraphs",[]);B(this,"currentTheme",Ir.wasteland);B(this,"customThemeOverride",null);B(this,"hemiLight");B(this,"dirLight");B(this,"rimLight");B(this,"bossLight");B(this,"roadMat");B(this,"abyssMat");B(this,"curbMat");B(this,"curbStripMat");B(this,"cliffPrimaryMat");B(this,"cliffSecondaryMat");B(this,"roofMat");B(this,"foliageMat");B(this,"trimMat");B(this,"ironSharedMat");B(this,"creamWallSharedMat");B(this,"windowGlowSharedMat");B(this,"themeLandmarkGroup",new re);B(this,"themeSpinners",[]);B(this,"crystalMat");B(this,"bossArmorMat");B(this,"bossSecondaryMat");B(this,"bossEyeMat");B(this,"radarDish");B(this,"holoGlobeGroup");B(this,"bastionTurretPods",[]);B(this,"abyssShaderMat");B(this,"waterfallShaderMat");B(this,"bastionShieldMat");B(this,"planetGroup");B(this,"planetBodyMat");B(this,"planetRingMat");B(this,"planetHaloMat");B(this,"floatingMonoliths",[]);B(this,"skyCruisers",[]);B(this,"distantLaserTimer",1.2);B(this,"gateTextures",{});B(this,"ambientWeatherTimer",0);B(this,"levelGroup",new re);B(this,"gates",[]);B(this,"walls",[]);B(this,"wallRuntimes",[]);B(this,"gears",[]);B(this,"nests",[]);B(this,"barrels",[]);B(this,"zones",[]);B(this,"bumpers",[]);B(this,"jumpPadSoundCooldown",0);B(this,"stageCombatTime",0);B(this,"units",[]);B(this,"nextUnitId",1);B(this,"blueBodyInst");B(this,"blueMarineMat");B(this,"championInst");B(this,"champMat");B(this,"redBodyInst");B(this,"bruteInst");B(this,"banelingInst");B(this,"shamanInst");B(this,"unitShadowInst");B(this,"particleInst");B(this,"blueAnimData",new Float32Array(Qe*4));B(this,"champAnimData",new Float32Array(120*4));B(this,"redAnimData",new Float32Array(Qe*4));B(this,"bruteAnimData",new Float32Array(120*4));B(this,"banelingAnimData",new Float32Array(180*4));B(this,"shamanAnimData",new Float32Array(120*4));B(this,"blueAnimAttr");B(this,"champAnimAttr");B(this,"redAnimAttr");B(this,"bruteAnimAttr");B(this,"banelingAnimAttr");B(this,"shamanAnimAttr");B(this,"particles",[]);B(this,"shockwaves",[]);B(this,"skyPillars",[]);B(this,"fxFlashEl",null);B(this,"dummy",new Oe);B(this,"tempVec",new G);B(this,"gridCellSize",1.35);B(this,"gridMap",new Map);B(this,"gridCellPool",[]);B(this,"gridCellPoolUsed",0);B(this,"isMobileDevice");B(this,"usePostProcessing",!0);B(this,"lowSpecMode",!1);B(this,"slowFrameStreak",0);B(this,"avgFrameMs",16.6);B(this,"frameTickCounter",0);B(this,"targetSearchResult",{target:null,blocked:!1,dist:1/0});B(this,"currentLevel");B(this,"bossHp",2500);B(this,"bossMaxHp",2500);B(this,"bossBerserkTriggered",!1);B(this,"playerBaseHp",1e3);B(this,"playerBaseMaxHp",1e3);B(this,"activeBlueCount",0);B(this,"activeRedCount",0);B(this,"isOverrunFrenzy",!1);B(this,"overrunTimer",0);B(this,"isStageEnded",!1);B(this,"isPaused",!0);B(this,"victoryClimaxTimer",0);B(this,"lastStageVictory",!1);B(this,"victoryFireworkTimer",0);B(this,"killStreakCount",0);B(this,"killStreakWindowTimer",0);B(this,"nextStreakMilestone",25);B(this,"adrenalineTimer",0);B(this,"enemyBaseWorldHpEl");B(this,"enemyBaseWorldFillEl");B(this,"enemyBaseWorldTextEl");B(this,"playerBaseWorldHpEl");B(this,"playerBaseWorldFillEl");B(this,"playerBaseWorldTextEl");B(this,"activeBlueIndices",[]);B(this,"activeRedIndices",[]);B(this,"activeAegisIndices",[]);B(this,"shootTimer",0);B(this,"enemySpawnTimer",0);B(this,"bruteSpawnTimer",0);B(this,"shamanSpawnTimer",0);B(this,"elapsedTime",0);B(this,"isPointerDown",!1);B(this,"keysDown",new Set);B(this,"raycaster",new Sx);B(this,"groundPlane",new wi(new G(0,1,0),0));B(this,"pointerNDC",new ft);B(this,"onBanner");B(this,"onStageEnd");this.canvas=t,this.labelsContainer=e,this.state=n,this.isMobileDevice=window.matchMedia("(max-width: 860px), (pointer: coarse)").matches||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),this.usePostProcessing=!this.isMobileDevice;const s=window.devicePixelRatio||1,a=this.isMobileDevice?Math.min(s,1.35):Math.min(Math.max(s,1.5),2.25);this.renderer=new Nv({canvas:this.canvas,antialias:!0,powerPreference:this.isMobileDevice?"default":"high-performance"});const o=this.renderer.getContext(),r=o.getExtension("WEBGL_debug_renderer_info"),l=r?String(o.getParameter(r.UNMASKED_RENDERER_WEBGL)):"";/SwiftShader|llvmpipe|Software|Basic Render/i.test(l)&&(this.usePostProcessing=!1),this.renderer.setPixelRatio(this.usePostProcessing?a:Math.min(s,1.5)),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=nc,this.renderer.shadowMap.autoUpdate=!1,this.renderer.shadowMap.needsUpdate=!0,this.renderer.toneMapping=ic,this.renderer.toneMappingExposure=1.12,this.scene=new Xu,this.scene.background=new Tt(2450411),this.scene.fog=new Sa(6333946,.0016);const c=new zl(this.renderer);c.compileEquirectangularShader();const d=new qx;this.scene.environment=c.fromScene(d,.04).texture,this.scene.environmentIntensity=.36,d.dispose(),c.dispose(),this.camera=new pn(26,window.innerWidth/window.innerHeight,1,220),this.applyCameraTransform(),this.composer=new Gx(this.renderer),this.composer.setPixelRatio(a),this.composer.setSize(window.innerWidth,window.innerHeight);const u=new Vx(this.scene,this.camera);this.bloomPass=new Ws(new ft(Math.floor(window.innerWidth*a*.5),Math.floor(window.innerHeight*a*.5)),.16,.32,.92);const f=new Xx;this.cinemaPass=new of({uniforms:{tDiffuse:{value:null},uResolution:{value:new ft(window.innerWidth*a,window.innerHeight*a)},uAberration:{value:0},uVignette:{value:.1},uDangerPulse:{value:0}},vertexShader:`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;
        uniform float uAberration;
        uniform float uVignette;
        uniform float uDangerPulse;
        varying vec2 vUv;

        void main() {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          vec2 centerVec = vUv - 0.5;
          float dist = length(centerVec);

          vec3 col = texture2D(tDiffuse, vUv).rgb;
          if (uAberration > 0.015) {
            vec2 caOffset = centerVec * dist * (uAberration * 0.008);
            col.r = texture2D(tDiffuse, vUv + caOffset).r;
            col.b = texture2D(tDiffuse, vUv - caOffset).b;
          }

          vec3 tc = texture2D(tDiffuse, vUv + vec2( 0.0,      texel.y)).rgb;
          vec3 bc = texture2D(tDiffuse, vUv + vec2( 0.0,     -texel.y)).rgb;
          vec3 ml = texture2D(tDiffuse, vUv + vec2(-texel.x,  0.0)).rgb;
          vec3 mr = texture2D(tDiffuse, vUv + vec2( texel.x,  0.0)).rgb;

          // Crisp 3D Supercell CAS Sharpening & Subtle Vibrance Boost
          vec3 blur = (tc + bc + ml + mr) * 0.25;
          col = clamp(col + (col - blur) * 0.22, 0.0, 1.0);
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          col = clamp(mix(vec3(luma), col, 1.12), 0.0, 1.0);

          // 4. Light Sunny Vignette & Low-HP Danger Edge Pulse
          float vig = smoothstep(0.95, 0.32, dist * (0.82 + uVignette * 0.22));
          col *= mix(0.94, 1.0, vig);
          float edgeMask = smoothstep(0.35, 0.78, dist);
          col = mix(col, vec3(0.95, 0.22, 0.26), edgeMask * uDangerPulse * 0.32);

          // 5. NaN/Inf Sanitize Guard
          if (any(isnan(col)) || any(isinf(col))) col = vec3(0.92, 0.85, 0.74);

          gl_FragColor = vec4(col, 1.0);
        }
      `}),this.composer.addPass(u),this.composer.addPass(this.bloomPass),this.composer.addPass(f),this.composer.addPass(this.cinemaPass),this.initPools(),this.setupLights(),this.buildEnvironment(),this.buildTurret(),this.buildBossOverlord(),this.buildInstancedMeshes(),this.bindInput(),this.scene.add(this.levelGroup)}initPools(){for(let t=0;t<Qe;t++)this.units.push({active:!1,id:0,team:"blue",kind:"normal",x:0,z:0,vx:0,vz:0,yaw:0,turnRate:0,walkPhase:0,attackAnim:0,spawnHop:0,hp:10,maxHp:10,dmg:10,radius:.35,speed:8,age:0,attackCooldown:0,specialTimer:0,passedGates:new Set});for(let t=0;t<pa;t++)this.particles.push({active:!1,x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,maxLife:1,scale:.2,color:new Tt(16777215)})}setupLights(){this.hemiLight=new xx(16774628,10383178,1.05),this.scene.add(this.hemiLight),this.dirLight=new Wh(16773332,1.78),this.dirLight.position.set(16,38,24),this.dirLight.castShadow=!0,this.dirLight.shadow.mapSize.set(1024,1024),this.dirLight.shadow.bias=-4e-4,this.dirLight.shadow.normalBias=.02,this.dirLight.shadow.camera.near=5,this.dirLight.shadow.camera.far=95;const t=26;this.dirLight.shadow.camera.left=-t,this.dirLight.shadow.camera.right=t,this.dirLight.shadow.camera.top=t,this.dirLight.shadow.camera.bottom=-t,this.scene.add(this.dirLight),this.rimLight=new Wh(16763010,0),this.bossLight=new ko(16755021,0,26);for(let e=0;e<4;e++){const n=new ko(3718648,0,14);n.visible=!1,this.scene.add(n),this.combatLights.push({light:n,life:0,maxLife:.35,maxIntensity:6})}}spawnCombatLight(t,e,n,s,a=6,o=14,r=.36){if(this.isMobileDevice||this.lowSpecMode||!this.usePostProcessing)return;let l=this.combatLights[0];for(const c of this.combatLights){if(!c.light.visible){l=c;break}c.life/c.maxLife>l.life/l.maxLife&&(l=c)}l.light.color.setHex(s),l.light.intensity=a,l.light.distance=o,l.light.position.set(t,e,n),l.light.visible=!0,l.life=0,l.maxLife=r,l.maxIntensity=a}buildEnvironment(){const t=this.currentTheme;this.abyssMat=new le({map:jh(t)});const e=new F(new Xe(280,240),this.abyssMat);e.rotation.x=-Math.PI/2,e.position.set(0,-6.8,1.5),this.scene.add(e),this.abyssShaderMat=Cx(t);const n=new F(new Xe(280,240),this.abyssShaderMat);n.rotation.x=-Math.PI/2,n.position.set(0,-6.4,1.5),this.scene.add(n);const s=new Nt(ue*2+1.2,1.35,44),a=wx(),o=bx();this.roadMat=new Ht({map:Yh(t),normalMap:o,normalScale:new ft(.42,.42),roughnessMap:a,bumpMap:a,bumpScale:.032,emissive:new Tt(16777215),emissiveMap:Zh(),emissiveIntensity:.06,roughness:.76,metalness:.05});const r=new F(s,this.roadMat);r.position.set(0,-.68,.5),r.receiveShadow=!0,this.scene.add(r);const l=te(new Ht({color:t.crystalColor,roughness:.42,metalness:.22}));this.trimMat=l;const c=te(new Ht({color:4080204,roughness:.56,metalness:.18}));this.ironSharedMat=c;const d=te(new Ht({color:t.roofColor,roughness:.52,metalness:.15}));this.roofMat=d;const u=te(new Ht({color:t.foliageColor,roughness:.68,metalness:.02}));this.foliageMat=u;const f=new le({color:16770204});this.windowGlowSharedMat=f;const m=new le({map:Px(),transparent:!0,alphaTest:.04,depthWrite:!1,side:Ae});this.curbMat=te(new Ht({color:t.curbColor,roughness:.68,metalness:.06})),this.curbStripMat=new le({color:t.curbEmissive}),this.cliffPrimaryMat=te(new Ht({color:t.cliffColor,roughness:.72,metalness:.06})),this.cliffSecondaryMat=te(new Ht({color:t.cliffSecondaryColor,roughness:.74,metalness:.06})),this.crystalMat=te(new Ht({color:t.crystalColor,emissive:t.crystalEmissive,emissiveIntensity:.18,roughness:.42,metalness:.22}));for(const E of[-15,-5,5,15])for(const I of[-1,1]){const V=I*(ue-.8),$=new F(new Nt(2.1,6.6,2.5),this.cliffPrimaryMat);$.position.set(V,-3.8,E),this.scene.add($);const Q=new F(new Nt(2.35,.42,2.75),this.curbMat);Q.position.set(V,-.75,E),this.scene.add(Q)}const p=new Nt(1.05,.78,44);for(const E of[-1,1]){const I=new F(p,this.curbMat);I.position.set(E*(ue+.48),.34,.5),I.castShadow=!0,I.receiveShadow=!0,this.scene.add(I)}for(let E=-17;E<=17.5;E+=2.6)for(const I of[-1,1]){const V=I*(ue+.52),$=new F(new Nt(1.16,.34,1.85),this.curbMat);if($.position.set(V,.84,E),$.castShadow=!0,$.receiveShadow=!0,this.scene.add($),Math.abs(Math.round(E))%5!==0){const Q=new re;Q.position.set(I*(ue-.06),.12,E+.95);for(let it=-1;it<=1;it++){const W=new F(new Ie(.16,.56,5),u);W.position.set(it*.11,.22,it*.08),W.rotation.z=-I*(.28+it*.18),W.rotation.x=it*.22,Q.add(W)}this.scene.add(Q)}}const S=new lt(.46,.46,40,14);S.rotateX(Math.PI/2);for(const E of[-1,1]){const I=E*(ue+1.52),V=new F(S,l);V.position.set(I,.72,.2),V.castShadow=!0,this.scene.add(V);for(const $ of[-14,-7,0,7,14]){const Q=new F(new lt(.6,.6,.24,14),l);Q.rotation.x=Math.PI/2,Q.position.set(I,.72,$),this.scene.add(Q);const it=new F(new Nt(.85,.9,.36),c);it.position.set(I-E*.35,.42,$),this.scene.add(it)}for(const $ of[-10.5,2.5,11.5]){const Q=new F(new lt(.36,.42,2.4,12),l);Q.position.set(I+E*.48,1.55,$),Q.castShadow=!0,this.scene.add(Q);const it=new F(new lt(.5,.46,.26,12),c);it.position.set(I+E*.48,2.72,$),this.scene.add(it)}}for(const E of[13.5,4,-5.5,-14.5])for(const I of[-1,1]){const V=I*(ue+.55),$=new re;$.position.set(V,1,E);const Q=new F(new lt(.24,.34,.45,8),c);Q.position.y=.22,$.add(Q);const it=new F(new lt(.1,.14,2.35,8),c);it.position.y=1.55,it.castShadow=!0,$.add(it);const W=new F(new lt(.28,.2,.56,6),f);W.position.y=2.95,$.add(W);const j=new F(new Ie(.38,.34,6),l);j.position.y=3.38,$.add(j),this.scene.add($)}this.scene.add(this.themeLandmarkGroup),this.rebuildThemeLandmarks(t),this.waterfallShaderMat=Ax(16774628);const g=[{x:-15.4,z:-16.5,w:3,h:12,rotY:.38},{x:15.4,z:-16.5,w:3,h:12,rotY:-.38},{x:-15.8,z:-1.5,w:2.6,h:10.5,rotY:.42},{x:15.8,z:-1.5,w:2.6,h:10.5,rotY:-.42}];for(const E of g){const I=new F(new Xe(E.w,E.h),this.waterfallShaderMat);I.position.set(E.x,3.2,E.z),I.rotation.y=E.rotY,this.scene.add(I)}this.floatingMonoliths=[];const h=[{x:-14.5,y:10.2,z:-22.5,s:1.45,phase:0},{x:14.5,y:10.5,z:-22.5,s:1.45,phase:1.6},{x:-18.5,y:8.6,z:-11,s:1.2,phase:2.8},{x:18.5,y:8.8,z:-11,s:1.2,phase:4.1},{x:-17.5,y:7.4,z:2.5,s:1.05,phase:5.2},{x:17.5,y:7.6,z:2.5,s:1.05,phase:.9}];for(const E of h){const I=new re;I.position.set(E.x,E.y,E.z);for(const[Q,it,W,j]of[[0,0,0,3.8],[-1.35,-.25,.25,2.8],[1.4,-.22,-.2,2.9]]){const ht=new F(new Xe(j*E.s,j*.82*E.s),m);ht.position.set(Q*E.s,it*E.s,W*E.s),ht.rotation.x=-.34,I.add(ht)}const V=new F(new ie(.45*E.s,.05*E.s,6,14),l);V.position.y=-.8*E.s,V.visible=!1,I.add(V);const $=new F(new ie(.32*E.s,.04*E.s,6,12),l);$.visible=!1,I.add($),this.scene.add(I),this.floatingMonoliths.push({group:I,ringOuter:V,ringInner:$,baseY:E.y,phase:E.phase})}this.planetGroup=new re,this.planetGroup.position.set(-16,25,-58),this.planetBodyMat=new Ht({color:16774614,emissive:16765565,emissiveIntensity:.65,roughness:.4,metalness:0});const b=new F(new Xt(5.6,20,16),this.planetBodyMat);this.planetGroup.add(b),this.planetHaloMat=new le({color:16770211,transparent:!0,opacity:.32,side:Ae,depthWrite:!1});const w=new F(new Ta(9.6,32),this.planetHaloMat);w.lookAt(this.baseCameraPos),this.planetGroup.add(w),this.planetRingMat=new le({color:16773314,transparent:!0,opacity:0,depthWrite:!1}),this.scene.add(this.planetGroup),this.skyCruisers=[];const y=new Ht({color:16314075,roughness:.45,metalness:.08}),C=[{x:-24.5,y:15,z:-22,dirZ:1,speed:1.1,phase:0,scale:1.15},{x:25,y:16.2,z:-12,dirZ:-1,speed:.95,phase:2.1,scale:1.2},{x:-23,y:12.5,z:3,dirZ:1,speed:1.25,phase:4,scale:.92},{x:23.5,y:13.5,z:-28,dirZ:-1,speed:1.05,phase:1.2,scale:1}];for(const E of C){const I=new re;I.position.set(E.x,E.y,E.z),I.scale.setScalar(E.scale),E.dirZ<0&&(I.rotation.y=Math.PI);const V=new F(new Xt(1.45,16,12),y);V.scale.set(1,.95,2.25),I.add(V);for(const it of[-.95,.95]){const W=new F(new ie(1.32,.075,8,20),l);W.position.z=it,I.add(W)}const $=new F(new Nt(.88,.65,1.75),d);$.position.set(0,-1.65,0),I.add($);const Q=new F(new Nt(.92,.28,.95),f);Q.position.set(0,-1.58,.12),I.add(Q);for(const it of[-1,1]){const W=new F(new Nt(1.15,.08,.95),d);W.position.set(it*.95,0,-2.35),I.add(W)}this.scene.add(I),this.skyCruisers.push({group:I,baseX:E.x,baseY:E.y,baseZ:E.z,dirZ:E.dirZ,speed:E.speed,phase:E.phase})}const v=new F(new Nt(ue*2+1,.62,1.05),this.curbMat);v.position.set(0,.24,wt+.62),v.receiveShadow=!0,this.scene.add(v);const T=new F(new lt(.11,.11,ue*2-.8,12),l);T.rotation.z=Math.PI/2,T.position.set(0,.64,wt+.18),this.scene.add(T),this.bastionShieldMat=Rx(t.curbEmissive);const P=new F(new Xe(ue*2-1.4,.55),this.bastionShieldMat);P.rotation.x=-Math.PI/2,P.position.set(0,.03,wt-1.15),this.scene.add(P),this.bastionTurretPods=[];for(const E of[-1,1]){const I=E*(ue-.55),V=new F(new ie(1.05,.42,12,16,Math.PI*.65),l);V.position.set(E*(ue-.1),.72,wt+.52),V.rotation.y=E<0?.25:Math.PI-.25,this.scene.add(V);const $=new F(new lt(.56,.56,.24,14),l);$.rotation.z=Math.PI/2,$.position.set(I,.82,wt+.52),this.scene.add($);const Q=new re;Q.position.set(E*(ue+1.45),1.65,wt-.65);const it=new F(new Xt(.52,12,10),l);Q.add(it);const W=new F(new lt(.14,.2,.95,10),y);W.rotation.x=Math.PI/2.3,W.position.set(0,.15,-.48),Q.add(W),this.scene.add(Q),this.bastionTurretPods.push(Q)}const x=240,M=new Float32Array(x*3),_=new Float32Array(x*3),N=new Tt(16776695),U=new Tt(16771768),H=new Tt(14480639);for(let E=0;E<x;E++){const I=E*3;M[I]=(Math.random()-.5)*105,M[I+1]=.5+Math.random()*34,M[I+2]=-46+Math.random()*74;const V=E%4===0?U:E%5===0?H:N;_[I]=V.r,_[I+1]=V.g,_[I+2]=V.b}const z=new Ue;z.setAttribute("position",new Le(M,3)),z.setAttribute("color",new Le(_,3));const L=new qu({size:.28,vertexColors:!0,transparent:!0,opacity:.48,depthWrite:!1});this.starfieldPoints=new Fv(z,L),this.starfieldPoints.visible=!1,this.scene.add(this.starfieldPoints),this.godRayMats=[];const A=[{x:-11.5,y:14,z:-15,w:7.5,h:34,op:.032},{x:-2,y:15,z:-8,w:8.5,h:36,op:.028},{x:8.5,y:13.5,z:-13.5,w:7,h:34,op:.025}];for(const E of A){const I=new le({color:16773836,transparent:!0,opacity:E.op,side:Ae,blending:ka,depthWrite:!1}),V=new F(new Xe(E.w,E.h),I);V.position.set(E.x,E.y,E.z),V.rotation.z=-.34,V.rotation.y=.18,this.scene.add(V),this.godRayMats.push(I)}}buildTurret(){this.turretGroup.position.set(this.turretX,.14,wt-.5),this.turretGroup.scale.setScalar(1.25);const t=te(new Ht({color:16103470,metalness:.68,roughness:.22})),e=te(new Ht({color:2831688,metalness:.58,roughness:.28})),n=te(new Ht({color:14251782,metalness:.46,roughness:.24})),s=new Ei(1.32,1.56,32);s.rotateX(-Math.PI/2);const a=new le({color:16172115,transparent:!0,opacity:.42,side:Ae,depthWrite:!1}),o=new F(s,a);o.position.set(0,.04,-.15),this.turretGroundRingMat=a,this.turretGroup.add(o);const r=new Xe(.11,24);r.rotateX(-Math.PI/2);const l=new le({color:16777215,transparent:!0,opacity:.22,depthWrite:!1}),c=new F(r,l);c.position.set(0,.06,-13.5),this.turretGroup.add(c);const d=document.createElement("canvas");d.width=256,d.height=256;const u=d.getContext("2d");u.fillStyle="#fff8f0",u.fillRect(0,0,256,256),u.translate(128,128);for(let Kt=0;Kt<12;Kt++)Kt%2===0&&(u.fillStyle="#ef4444",u.beginPath(),u.moveTo(0,0),u.arc(0,0,126,Kt*Math.PI/6,(Kt+1)*Math.PI/6),u.closePath(),u.fill());u.lineWidth=10,u.strokeStyle="#dc2626",u.beginPath(),u.arc(0,0,120,0,Math.PI*2),u.stroke();const f=new In(d);f.colorSpace=qe;const m=te(new Ht({map:f,roughness:.32,metalness:.05})),p=te(new Ht({color:7025684,roughness:.48,metalness:.1})),S=te(new Ht({color:15680580,roughness:.3,metalness:.08})),g=te(new Ht({color:2278750,roughness:.32,metalness:.15})),h=te(new Ht({color:2450411,roughness:.32,metalness:.15}));for(const Kt of[-1,1]){const st=new F(new lt(.62,.62,.36,22),m);st.rotation.z=Math.PI/2,st.position.set(Kt*1.04,.6,-.05),st.castShadow=!0,this.turretGroup.add(st);const pt=new F(new lt(.24,.24,.42,14),t);pt.rotation.z=Math.PI/2,pt.position.set(Kt*1.06,.6,-.05),this.turretGroup.add(pt);const O=new F(new Nt(.3,.92,1.78),p);O.position.set(Kt*.72,.62,.08),O.castShadow=!0,this.turretGroup.add(O);const Ft=new F(new lt(.32,.32,.16,12),Kt<0?g:h);Ft.rotation.z=Math.PI/2,Ft.position.set(Kt*.9,.88,.34),this.turretGroup.add(Ft)}const b=te(new Ht({color:15485081,roughness:.24,metalness:.22})),w=new F(new lt(.26,.26,.15,12),b);w.rotation.z=Math.PI/2,w.position.set(.92,.56,.52),this.turretGroup.add(w),this.turretBodyMat=new Ht({color:14196274,metalness:.72,roughness:.24});const y=new F(new Nt(1.44,.44,1.88),p);y.position.set(0,.35,.12),y.castShadow=!0,this.turretGroup.add(y),this.turretDomeMat=new Ht({color:3718648,metalness:.35,roughness:.22,emissive:165063,emissiveIntensity:.2});const C=new lt(.46,.64,2.35,22);C.rotateX(Math.PI/2),this.turretBarrelMat=n,this.turretBarrel=new F(C,n),this.turretBarrel.position.set(0,.96,-.62),this.turretBarrel.castShadow=!0;const v=new F(new ie(.49,.115,12,22),m);v.position.set(0,0,-1.12),this.turretBarrel.add(v);const T=new F(new ie(.46,.08,10,20),t);T.position.set(0,0,-.92),this.turretBarrel.add(T);const P=new F(new lt(.36,.36,.16,18),new le({color:1975344}));P.rotation.x=Math.PI/2,P.position.set(0,0,-1.16),this.turretBarrel.add(P);const x=new F(new ie(.57,.095,10,22),t);x.position.set(0,0,.12),this.turretBarrel.add(x);const M=new F(new ie(.53,.065,10,22),S);M.position.set(0,0,-.38),this.turretBarrel.add(M);const _=new F(new Nt(.28,.24,.42),t);_.position.set(0,.62,.12),this.turretBarrel.add(_);const N=new F(new ie(.64,.11,12,22),t);N.position.set(0,0,.92),this.turretBarrel.add(N);const U=new F(new Xt(.62,18,14),t);U.scale.set(1,1,.65),U.position.set(0,0,1.12),this.turretBarrel.add(U);const H=new F(new Xt(.26,14,12),m);H.position.set(0,0,1.54),this.turretBarrel.add(H);const z=new F(new ie(.22,.045,8,14,Math.PI*1.15),S);z.rotation.y=Math.PI/2,z.position.set(0,.2,1.68),this.turretBarrel.add(z),this.turretGroup.add(this.turretBarrel);const L=new re;L.position.set(.96,1.02,.24),L.rotation.set(-.66,-.16,0);const A=new F(new lt(.08,.08,.42,8),e);A.position.set(-.22,-.28,-.05),A.rotation.z=.55,L.add(A);const E=new F(new lt(.42,.42,.18,22),t);E.rotation.x=Math.PI/2,E.castShadow=!0,L.add(E);const I=new F(new ie(.4,.055,10,22),t);I.position.z=.08,L.add(I);const V=new F(new Ta(.35,22),new le({color:16776437}));V.position.z=.095,L.add(V);for(let Kt=0;Kt<7;Kt++){const st=-Math.PI*.75+Kt/6*Math.PI*1.5,pt=new F(new Nt(.03,.075,.01),new le({color:Kt>=5?14235698:3878438}));pt.position.set(Math.sin(st)*.26,Math.cos(st)*.26,.105),pt.rotation.z=-st,L.add(pt)}const $=new re;$.position.set(0,0,.115);const Q=new F(new Nt(.042,.26,.015),new le({color:14038574}));Q.position.y=.1,$.add(Q);const it=new F(new Ta(.048,12),new le({color:2892318}));it.position.z=.008,$.add(it),$.rotation.z=-.45,this.turretGaugeNeedle=$,L.add($),this.turretGroup.add(L),this.buildIdolCheerleaderMascot(t,e),this.turretGroup.add(this.mascotGroup),this.turretMuzzleLight=new ko(3718648,0,5),this.turretMuzzleLight.position.set(0,.96,-1.85),this.turretGroup.add(this.turretMuzzleLight);const W=new lt(.16,.22,1.35,12);W.rotateX(Math.PI/2);for(const Kt of[-1,1]){const st=new F(W,t);st.position.set(Kt*.78,.88,-.58),this.turretEvo1Group.add(st)}this.turretEvo1Group.visible=!1,this.turretGroup.add(this.turretEvo1Group);const j=new Ht({color:16764736,emissive:14254616,emissiveIntensity:.45,metalness:.78,roughness:.18}),ht=new F(new ie(.68,.075,8,24),j);ht.rotation.x=Math.PI/2,ht.position.set(0,1.62,-.1),this.turretEvoHalo=ht,this.turretEvo2Group.add(ht),this.turretEvo2Group.visible=!1,this.turretGroup.add(this.turretEvo2Group),this.scene.add(this.turretGroup);const dt=new Ht({color:16236076,emissive:10576391,emissiveIntensity:.35,metalness:.75,roughness:.2}),Rt=new F(new Xt(.7,16,12),dt);Rt.scale.set(1.05,.92,.95),Rt.position.y=.65,Rt.castShadow=!0,this.lootBugGroup.add(Rt);const Pt=new F(new lt(.42,.28,.35,12),dt);Pt.position.set(0,1.25,0),this.lootBugGroup.add(Pt);const kt=new F(new ie(.28,.06,8,14),t);kt.position.set(0,1.55,0),this.lootBugGroup.add(kt),this.lootBugGroup.visible=!1,this.scene.add(this.lootBugGroup)}buildIdolCheerleaderMascot(t,e){this.mascotGroup=new re,this.mascotGroup.position.set(-1.75,.04,.25);const n=new F(new Xe(1.45,1.05),new le({map:Jh(),transparent:!0,depthWrite:!1}));n.rotation.x=-Math.PI/2,n.position.set(0,.02,.05),this.mascotGroup.add(n);const s=new re;s.position.set(0,.12,0),s.rotation.x=-.58;const a=new Ht({color:959977,emissive:165063,emissiveIntensity:.22,roughness:.16,metalness:.1}),o=new F(new Xt(.64,20,16),a);o.scale.set(1.06,.96,1.02),o.position.set(0,.56,0),o.castShadow=!0,s.add(o);const r=new F(new Ie(.38,.48,16),a);r.position.set(0,1.12,0),s.add(r);const l=new Ht({color:15680580,roughness:.35}),c=new F(new ie(.56,.085,10,20),l);c.rotation.x=Math.PI/2,c.position.set(0,.84,.04),s.add(c);const d=new le({color:16777215});for(const f of[-1,1]){const m=new F(new Xt(.13,10,8),d);m.position.set(f*.23,.62,.56),s.add(m);const p=new F(new Xt(.075,8,8),e);p.position.set(f*.23,.62,.65),s.add(p)}const u=new F(new Ie(.24,.46,12),t);u.rotation.z=Math.PI/2,u.position.set(.72,.56,.32),s.add(u),this.mascotLeftArm=s,this.mascotGroup.add(s)}syncTurretEvolution(t=!1){var s;const e=Math.max(this.state.fireRateLevel,this.state.powerLevel),n=e>=10?2:e>=5?1:0;if(this.turretEvo1Group.visible=n>=1,this.turretEvo2Group.visible=n>=2,this.turretBarrel){const a=n===2?1.18:n===1?1.09:1;this.turretBarrel.scale.set(a,1,a)}if(t&&n>this.currentTurretEvoTier){const a=n===2,o=a?16763187:2672634;this.mascotCheerBoost=1.2,this.triggerScreenFlash(a?"#ffc933":"#28c7fa",.45),this.addCameraShake(.5),this.spawnSkyPillar(this.turretX,wt-.8,o,2.2,.5),this.spawnShockwave(this.turretX,wt-.8,o,4.6,.45),this.spawnBurstParticles(this.turretX,1.2,wt-.8,o,50),this.spawnFloatingPopup(this.turretX,2.3,wt-1,a?"👑 皇家黄金礼花炮!":"🎵 双联增压波波炮!",a?"#f59e0b":"#0ea5e9"),(s=this.onBanner)==null||s.call(this,a?"👑 泡泡炮终极进化：皇家黄金礼花炮！":"🎵 泡泡炮进化：双联蒸汽增压炮！",a?"波波团体型 +16% · 黄金应援光环开启！":"波波团体型 +8% · 蒸汽副炮开启！")}this.currentTurretEvoTier=n}buildBossOverlord(){const t=this.currentTheme;this.bossGroup.position.set(0,0,Mt-3.2),this.bossArmorMat=te(new Ht({color:t.bossArmorColor,roughness:.72,metalness:.08})),this.bossSecondaryMat=te(new Ht({color:t.bossSecondaryColor,roughness:.65,metalness:.12})),this.bossEyeMat=new le({color:t.bossEyeColor});const e=te(new Ht({color:14854198,roughness:.42,metalness:.22})),n=te(new Ht({color:14465426,roughness:.72,metalness:.06})),s=te(new Ht({color:3882824,roughness:.52,metalness:.18})),a=te(new Ht({color:15099960,roughness:.46,metalness:.16})),o=te(new Ht({color:14410992,roughness:.42,metalness:.22})),r=te(new Ht({color:14239803,roughness:.68,metalness:.04})),l=new le({color:16774635}),c=new F(new Nt(5.2,7.6,3.8),this.bossArmorMat);c.position.set(-5.8,3.8,-.2),c.castShadow=!0,this.bossGroup.add(c);const d=new F(new Nt(5.2,7.6,3.8),this.bossArmorMat);d.position.set(5.8,3.8,-.2),d.castShadow=!0,this.bossGroup.add(d);const u=new F(new Nt(7.2,2.8,3.8),this.bossArmorMat);u.position.set(0,6.2,-.2),u.castShadow=!0,this.bossGroup.add(u);const f=new F(new Nt(17.6,.72,4.35),n);f.position.set(0,7.75,-.15),this.bossGroup.add(f),this.bossPortalMat=Ex(t.portalCoreColor,t.portalRingColor);const m=new F(new Xe(6.8,5.2),this.bossPortalMat);m.position.set(0,2.6,-.85),this.bossGroup.add(m);const p=new F(new Nt(7,.55,2.2),s);p.position.set(0,5.05,.9),this.bossGroup.add(p);for(const z of[-1,1]){const L=new F(new lt(2.15,2.35,11.2,16),this.bossArmorMat);L.position.set(z*6.8,5.6,-1.6),L.castShadow=!0,this.bossGroup.add(L);const A=new F(new lt(2.32,2.32,.42,16),e);A.position.set(z*6.8,9.6,-1.6),this.bossGroup.add(A);const E=new F(new Ie(2.45,2.8,16),this.bossSecondaryMat);E.position.set(z*6.8,12.6,-1.6),this.bossGroup.add(E);const I=z*5.25,V=new F(new lt(.08,.08,2.3,8),e);V.rotation.z=Math.PI/2,V.position.set(I,6.75,1.82),this.bossGroup.add(V);const $=new F(new Nt(1.85,3.6,.08),r);$.position.set(I,4.9,1.82),this.bossGroup.add($);const Q=new F(new Ie(1.3,.95,4),r);Q.rotation.x=Math.PI,Q.rotation.y=Math.PI*.25,Q.scale.set(1,1,.08),Q.position.set(I,2.65,1.82),this.bossGroup.add(Q);const it=new F(new Xt(.48,12,10),l);it.scale.set(1.05,.92,.16),it.position.set(I,4.72,1.88),this.bossGroup.add(it);for(const W of[-1,1]){const j=new F(new Ie(.16,.46,8),l);j.scale.set(1,1,.25),j.position.set(I+W*.24,5.22,1.88),j.rotation.z=-W*.16,this.bossGroup.add(j)}}this.bossPortalRingMat=new le({color:15249464}),this.bossPortalRing=new F(new lt(1.75,1.75,.45,20),e),this.bossPortalRing.rotation.x=Math.PI/2,this.bossPortalRing.position.set(0,8.2,1.85);const S=10;for(let z=0;z<S;z++){const L=z/S*Math.PI*2,A=new F(new Nt(.58,.46,.65),e);A.position.set(Math.cos(L)*1.92,0,Math.sin(L)*1.92),A.rotation.y=-L,this.bossPortalRing.add(A)}const g=new F(new lt(1.22,1.22,.48,18),s);this.bossPortalRing.add(g);const h=new F(new Xt(.76,14,12),e);h.scale.set(1.05,.35,.92),h.position.set(0,.22,.08),this.bossPortalRing.add(h);const b=new F(new Ie(.32,.55,10),e);b.rotation.x=-Math.PI/2,b.position.set(0,.24,-.62),this.bossPortalRing.add(b),this.bossGroup.add(this.bossPortalRing),this.bossHead=new re,this.bossHead.position.set(0,2.75,.55);const w=new F(new Xt(2.05,18,14),a);w.scale.set(1.18,1.05,.92),w.position.set(0,-.35,0),w.castShadow=!0,this.bossHead.add(w);const y=new F(new lt(2.12,2.16,.36,18),e);y.position.set(0,-.55,0),this.bossHead.add(y);const C=new F(new lt(.68,.68,2.2,12),r);C.position.set(-1.55,.55,-.55),this.bossHead.add(C);for(const z of[-1,1]){const L=new F(new Xt(.88,12,10),a);L.position.set(z*2.15,.45,.25),this.bossHead.add(L);const A=new F(new lt(.55,.65,1.8,10),s);A.position.set(z*2.25,-.65,.75),A.rotation.z=z*.28,A.rotation.x=.42,this.bossHead.add(A)}const v=new F(new Xt(1.15,16,14),s);v.position.set(0,1.38,.35),this.bossHead.add(v);const T=new F(new lt(1.18,1.18,.32,16),e);T.position.set(0,1.32,.36),this.bossHead.add(T);for(const z of[-1,1]){const L=new F(new Xt(.22,10,8),this.bossEyeMat);L.position.set(z*.42,1.34,1.44),this.bossHead.add(L)}const P=new re;P.position.set(1.55,.15,1.45),P.rotation.z=-.58;const x=new F(new Nt(.46,3.3,.24),o);P.add(x);const M=new F(new ie(.68,.24,8,14,Math.PI*1.4),o);M.position.set(0,1.85,0),M.rotation.z=.65,P.add(M),this.bossHead.add(P),this.bossGroup.add(this.bossHead);const _=new Xt(5.6,20,16,0,Math.PI*2,0,Math.PI*.65),N=new le({color:16096779,transparent:!0,opacity:.36,side:Ae,depthWrite:!1});this.bossShieldMesh=new F(_,N),this.bossShieldMesh.position.set(0,1.2,2.2),this.bossShieldMesh.visible=!1,this.bossGroup.add(this.bossShieldMesh);for(const z of[-1,1]){const L=new F(new lt(.55,.72,4.5,12),e);L.position.set(z*4.2,9.2,.4),L.rotation.z=-z*.22,this.megaBossCrownGroup.add(L)}const U=new F(new ie(4.2,.22,8,24),new le({color:16096779}));U.position.set(0,9.2,-1.2),this.megaBossHalo=U,this.megaBossCrownGroup.add(U),this.megaBossCrownGroup.visible=!1,this.bossGroup.add(this.megaBossCrownGroup),this.scene.add(this.bossGroup);const H=new Ei(.25,1,32);H.rotateX(-Math.PI/2);for(let z=0;z<3;z++){const L=new le({color:15680580,transparent:!0,opacity:.78,side:Ae,depthWrite:!1}),A=new F(H,L);A.visible=!1,this.scene.add(A),this.meteorTelegraphs.push({active:!1,x:0,z:0,radius:2.6,timer:0,maxTimer:2,isTurretLock:z===0,mesh:A,mat:L})}}applyTheme(t){var n,s,a;const e=Ir[t]||Ir.wasteland;this.currentTheme=e,this.scene.background=new Tt(e.skyColor),this.scene.fog=new Sa(e.fogColor,e.fogDensity),this.hemiLight.color.setHex(e.hemiSkyColor),this.hemiLight.groundColor.setHex(e.hemiGroundColor),this.hemiLight.intensity=e.hemiIntensity*.78,this.dirLight.color.setHex(e.sunColor),this.dirLight.intensity=e.sunIntensity*.82,this.rimLight.color.setHex(e.rimLightColor),this.bossLight.color.setHex(e.bossLightColor),this.roadMat.map&&this.roadMat.map.dispose(),this.roadMat.emissiveMap&&this.roadMat.emissiveMap.dispose(),this.roadMat.map=Yh(e),this.roadMat.emissiveMap=Zh(),this.roadMat.needsUpdate=!0,this.abyssMat.map&&this.abyssMat.map.dispose(),this.abyssMat.map=jh(e),this.abyssMat.needsUpdate=!0,(n=this.abyssShaderMat)!=null&&n.uniforms&&(this.abyssShaderMat.uniforms.uBaseColor.value.set(e.abyssBaseHex),this.abyssShaderMat.uniforms.uVeinColor.value.set(e.abyssVeinHex),this.abyssShaderMat.uniforms.uAccentColor.value.setHex(e.portalRingColor)),(s=this.bastionShieldMat)!=null&&s.uniforms&&this.bastionShieldMat.uniforms.uColor.value.setHex(e.curbEmissive);for(const o of this.godRayMats)o.color.setHex(e.sunColor);return this.curbMat.color.setHex(e.curbColor),this.curbStripMat.color.setHex(e.curbEmissive),this.cliffPrimaryMat.color.setHex(e.cliffColor),this.cliffSecondaryMat.color.setHex(e.cliffSecondaryColor),this.roofMat&&this.roofMat.color.setHex(e.roofColor),this.foliageMat&&this.foliageMat.color.setHex(e.foliageColor),this.trimMat&&this.trimMat.color.setHex(e.crystalColor),this.crystalMat.color.setHex(e.crystalColor),this.crystalMat.emissive.setHex(e.crystalEmissive),this.bossArmorMat.color.setHex(e.bossArmorColor),this.bossSecondaryMat.color.setHex(e.bossSecondaryColor),this.bossEyeMat.color.setHex(e.bossEyeColor),(a=this.bossPortalMat)!=null&&a.uniforms&&(this.bossPortalMat.uniforms.uCoreColor.value.setHex(e.portalCoreColor),this.bossPortalMat.uniforms.uRingColor.value.setHex(e.portalRingColor)),this.rebuildThemeLandmarks(e),e}rebuildThemeLandmarks(t){for(this.themeSpinners=[];this.themeLandmarkGroup.children.length>0;)this.themeLandmarkGroup.children.pop().traverse(a=>{var o;a.isMesh&&((o=a.geometry)==null||o.dispose())});const e=[{x:-17.2,y:.5,z:-13.5,w:6.2,h:9.8,d:6.4,idx:0},{x:17.2,y:.5,z:-13.5,w:6.2,h:9.8,d:6.4,idx:1},{x:-18,y:-.4,z:-3.2,w:6.4,h:8.2,d:6.4,idx:2},{x:18,y:-.4,z:-3.2,w:6.4,h:8.2,d:6.4,idx:3},{x:-17.6,y:-1,z:7.4,w:6,h:7.4,d:6,idx:4},{x:17.6,y:-1,z:7.4,w:6,h:7.4,d:6,idx:5},{x:-22.5,y:2.2,z:-22.5,w:7.8,h:14,d:7.4,idx:6},{x:22.5,y:2.2,z:-22.5,w:7.8,h:14,d:7.4,idx:7}];this.creamWallSharedMat||(this.creamWallSharedMat=te(new Ht({color:16775408,roughness:.55,metalness:.04})));const n=this.creamWallSharedMat;for(const s of e){const a=new re;a.position.set(s.x,s.y-s.h*.35,s.z);const o=s.x<0?1:-1,r=s.idx===2||s.idx===3||s.idx>=6;if(t.id==="sakura"){const l=new F(new Nt(s.w,s.h*.72,s.d),n);l.position.y=s.h*.36,a.add(l);const c=new F(new Nt(s.w+.3,.55,s.d+.3),this.cliffPrimaryMat);c.position.y=s.h*.72,a.add(c);for(let u=0;u<3;u++){const f=1.18-u*.24,m=s.h*.76+u*2.15,p=new F(new Ie(s.w*.72*f,1.35,4),this.roofMat);if(p.rotation.y=Math.PI*.25,p.position.y=m,a.add(p),u<2){const S=new F(new Nt(s.w*.58*f,1.35,s.d*.58*f),this.cliffPrimaryMat);S.position.y=m+.95,a.add(S)}}const d=new F(new lt(.42,.65,3.8,7),this.cliffSecondaryMat);d.position.set(o*(s.w*.35),s.h*.72+1.5,1.2),a.add(d);for(const[u,f,m,p]of[[0,3.6,0,2.3],[-1.3,2.9,.6,1.75],[1.3,3,-.5,1.8],[.3,4.4,.4,1.65]]){const S=new F(new Mc(p,1),this.foliageMat);S.position.set(o*(s.w*.35)+u,s.h*.72+f,1.2+m),a.add(S)}}else if(t.id==="glacier"){const l=new F(new lt(s.w*.56,s.w*.64,s.h*.75,10),this.cliffPrimaryMat);if(l.position.y=s.h*.375,a.add(l),r){const c=new F(new Xt(s.w*.44,14,12),this.roofMat);c.position.y=s.h*.75+s.w*.34,a.add(c);const d=new F(new Xt(s.w*.31,14,12),this.roofMat),u=s.h*.75+s.w*.88;d.position.y=u,a.add(d);const f=new F(new ie(s.w*.26,.32,8,16),this.cliffSecondaryMat);f.rotation.x=Math.PI*.5,f.position.y=s.h*.75+s.w*.64,a.add(f);const m=new F(new lt(s.w*.32,s.w*.32,.25,12),this.ironSharedMat);m.position.y=u+s.w*.25,a.add(m);const p=new F(new lt(s.w*.22,s.w*.2,1.6,12),this.ironSharedMat);p.position.y=u+s.w*.25+.85,a.add(p)}else for(const[c,d,u,f,m]of[[0,0,5.8,1.35,0],[-1.4,.9,4.2,.95,.24],[1.4,-.8,4.5,1,-.22]]){const p=new F(new Ie(f,u,6),this.foliageMat);p.position.set(c,s.h*.75+u*.45,d),p.rotation.z=m,a.add(p)}}else if(t.id==="magma"){const l=new F(new lt(s.w*.54,s.w*.4,s.h*.78,12),this.cliffPrimaryMat);l.position.y=s.h*.39,a.add(l);const c=new F(new Xt(s.w*.5,14,10),this.roofMat);c.scale.set(1,.62,1),c.position.y=s.h*.82,a.add(c);const d=new F(new Xt(s.w*.36,14,10),n);d.scale.set(1,.68,1),d.position.y=s.h*.82+1.45,a.add(d);const u=new F(new Xt(.95,12,10),this.roofMat);u.position.y=s.h*.82+2.85,a.add(u);const f=new F(new lt(.18,.18,4.2,8),n);f.position.set(o*(s.w*.38),s.h+1.6,1.2),a.add(f);const m=new re;m.position.set(o*(s.w*.38),s.h+3.8,1.2);const p=new F(new lt(1.65,1.65,.42,16),this.roofMat);p.rotation.z=Math.PI*.5,m.add(p);const S=new F(new ie(.95,.24,8,16),n);S.rotation.y=Math.PI*.5,m.add(S),a.add(m),this.themeSpinners.push(m)}else if(t.id==="cyberhive"){const l=new F(new lt(s.w*.52,s.w*.56,s.h*.72,12),this.cliffPrimaryMat);l.position.y=s.h*.36,a.add(l);const c=new F(new Ie(s.w*.68,3.4,12),this.roofMat);if(c.position.y=s.h*.72+1.65,a.add(c),r){const u=s.h+3.8;for(const S of[-1.2,1.2]){const g=new F(new lt(.22,.35,6.2,8),this.trimMat);g.position.set(0,u-2.6,S),g.rotation.x=S>0?-.22:.22,a.add(g)}const f=new re;f.position.set(0,u,0),f.rotation.y=Math.PI*.5;const m=new F(new ie(4.2,.26,8,20),this.trimMat);f.add(m);const p=new F(new lt(.75,.75,.6,12),this.roofMat);p.rotation.x=Math.PI*.5,f.add(p);for(let S=0;S<8;S++){const g=S/8*Math.PI*2,h=new F(new Xt(.62,10,8),S%2===0?this.roofMat:this.foliageMat);h.position.set(Math.cos(g)*4.2,Math.sin(g)*4.2,0),f.add(h)}a.add(f),this.themeSpinners.push(f)}}else if(t.id==="emerald"){const l=new F(new lt(s.w*.36,s.w*.46,s.h*.78,12),n);l.position.y=s.h*.39,a.add(l);const c=new F(new Xt(s.w*.64,16,12,0,Math.PI*2,0,Math.PI*.55),this.roofMat);c.position.y=s.h*.74,a.add(c);for(const[d,u,f,m]of[[0,s.w*.58,0,.75],[1.6,s.w*.38,1.2,.62],[-1.6,s.w*.38,-1.1,.62],[1.2,s.w*.42,-1.5,.58],[-1.3,s.w*.4,1.4,.58]]){const p=new F(new Xt(m,10,8),n);p.position.set(d,s.h*.74+u,f),a.add(p)}if(r){const d=new re;d.position.set(o*(s.w*.46),s.h*.62,0),d.rotation.y=o*Math.PI*.5;for(let u=0;u<4;u++){const f=new F(new Nt(.75,3.6,.14),this.trimMat);f.rotation.z=u*Math.PI/2,d.add(f)}a.add(d),this.themeSpinners.push(d)}}else if(t.id==="ocean"){const l=new F(new lt(s.w*.48,s.w*.58,s.h*.68,12),this.cliffPrimaryMat);l.position.y=s.h*.34,a.add(l);for(let u=0;u<4;u++){const f=new F(new lt(1.55-u*.14,1.68-u*.14,1.45,12),u%2===0?n:this.roofMat);f.position.y=s.h*.68+.72+u*1.42,a.add(f)}const c=new F(new lt(1.05,1.05,1.2,10),this.windowGlowSharedMat);c.position.y=s.h*.68+6.3,a.add(c);const d=new F(new Ie(1.35,1.4,10),this.roofMat);d.position.y=s.h*.68+7.5,a.add(d);for(const[u,f,m]of[[-1.8,1.4,3.8],[1.8,-1.2,3.4]]){const p=new F(new lt(.38,.62,m,8),this.foliageMat);p.position.set(u,s.h*.68+m*.45,f),p.rotation.z=u>0?-.28:.28,a.add(p)}}else if(t.id==="royal"){const l=new F(new Nt(s.w,s.h*.82,s.d),this.cliffPrimaryMat);l.position.y=s.h*.41,a.add(l);const c=new F(new Nt(s.w+.6,.75,s.d+.6),this.curbMat);c.position.y=s.h*.82+.2,a.add(c);for(const d of[-s.d*.34,s.d*.34]){const u=new F(new lt(1.45,1.55,4.8,12),n);u.position.set(o*(s.w*.28),s.h*.82+2.2,d),a.add(u);const f=new F(new Ie(1.95,3.2,12),this.roofMat);f.position.set(o*(s.w*.28),s.h*.82+6,d),a.add(f);const m=new F(new lt(.08,.08,1.8,6),this.trimMat);m.position.set(o*(s.w*.28),s.h*.82+8.1,d),a.add(m)}}else{const l=new F(new Nt(s.w,s.h,s.d),this.cliffPrimaryMat);l.position.y=s.h*.5,l.castShadow=!0,l.receiveShadow=!0,a.add(l);const c=new F(new Nt(s.w+.45,.48,s.d+.45),this.curbMat);if(c.position.y=s.h+.15,a.add(c),s.idx%2===0){const u=new F(new Xt(s.w*.44,14,10,0,Math.PI*2,0,Math.PI*.55),this.roofMat);u.position.y=s.h+.32,a.add(u)}else{const u=new F(new Ie(s.w*.66,2.6,4),this.roofMat);u.rotation.y=Math.PI*.25,u.position.y=s.h+1.55,a.add(u)}const d=new F(new lt(.58,.78,4.6,10),this.cliffSecondaryMat);if(d.position.set(-o*(s.w*.26),s.h+2.1,-.8),a.add(d),r){const u=new re;u.position.set(o*(s.w*.5+.25),s.h*.82,0),u.rotation.y=o*Math.PI*.5;const f=new F(new ie(1.5,.22,8,14),this.trimMat);u.add(f);for(let m=0;m<4;m++){const p=new F(new Nt(.65,3.8,.14),this.trimMat);p.rotation.z=m*Math.PI/2,u.add(p)}a.add(u),this.themeSpinners.push(u)}}for(const l of[-1.35,1.35]){const c=new F(new Nt(.24,1.45,1.15),this.ironSharedMat);c.position.set(o*(s.w*.5+.04),s.h*.52,l),a.add(c);const d=new F(new Nt(.28,1.18,.88),this.windowGlowSharedMat);d.position.set(o*(s.w*.5+.06),s.h*.52,l),a.add(d)}this.themeLandmarkGroup.add(a)}}cycleTheme(){const t=Ca.indexOf(this.currentTheme.id),e=Ca[(t+1)%Ca.length];return this.customThemeOverride=e,this.applyTheme(e)}buildInstancedMeshes(){const t=this.state.getEquippedSkin(),e=this.state.getActiveRaceBranch().id,n=od(t.palette,e);this.blueAnimAttr=new Ti(this.blueAnimData,4),this.blueAnimAttr.setUsage(rn),n.setAttribute("aAnim",this.blueAnimAttr),this.blueMarineMat=Rs({roughness:.16,metalness:.04,emissive:926261,emissiveIntensity:.05,shoulderY:.42,hipY:.14,rimColor:16777215,usePhysicalClearcoat:!this.isMobileDevice}),this.blueBodyInst=new Si(n,this.blueMarineMat,Qe),this.blueBodyInst.instanceMatrix.setUsage(rn),this.blueBodyInst.castShadow=!1,this.blueBodyInst.receiveShadow=!1,this.scene.add(this.blueBodyInst);const s=rd(t.palette,e);this.champAnimAttr=new Ti(this.champAnimData,4),this.champAnimAttr.setUsage(rn),s.setAttribute("aAnim",this.champAnimAttr),this.champMat=Rs({roughness:.18,metalness:.14,emissive:t.palette.emissive,emissiveIntensity:.08,shoulderY:.92,hipY:.24,rimColor:16774064,usePhysicalClearcoat:!this.isMobileDevice}),this.championInst=new Si(s,this.champMat,120),this.championInst.instanceMatrix.setUsage(rn),this.championInst.castShadow=!1,this.championInst.receiveShadow=!1,this.scene.add(this.championInst),this.applySkin(t);const a=Yx();this.redAnimAttr=new Ti(this.redAnimData,4),this.redAnimAttr.setUsage(rn),a.setAttribute("aAnim",this.redAnimAttr);const o=Rs({roughness:.44,metalness:.16,emissive:1968906,emissiveIntensity:.05,shoulderY:.58,hipY:.28,rimColor:16766640});this.redBodyInst=new Si(a,o,Qe),this.redBodyInst.instanceMatrix.setUsage(rn),this.redBodyInst.castShadow=!1,this.redBodyInst.receiveShadow=!1,this.scene.add(this.redBodyInst);const r=Zx();this.bruteAnimAttr=new Ti(this.bruteAnimData,4),this.bruteAnimAttr.setUsage(rn),r.setAttribute("aAnim",this.bruteAnimAttr);const l=Rs({roughness:.36,metalness:.26,emissive:2494472,emissiveIntensity:.06,shoulderY:1.18,hipY:.5,rimColor:16760952});this.bruteInst=new Si(r,l,120),this.bruteInst.instanceMatrix.setUsage(rn),this.bruteInst.castShadow=!1,this.bruteInst.receiveShadow=!1,this.scene.add(this.bruteInst);const c=jx();this.banelingAnimAttr=new Ti(this.banelingAnimData,4),this.banelingAnimAttr.setUsage(rn),c.setAttribute("aAnim",this.banelingAnimAttr);const d=Rs({roughness:.3,metalness:.34,emissive:3871240,emissiveIntensity:.12,shoulderY:.52,hipY:.24,rimColor:16757611});this.banelingInst=new Si(c,d,180),this.banelingInst.instanceMatrix.setUsage(rn),this.banelingInst.castShadow=!1,this.banelingInst.receiveShadow=!1,this.scene.add(this.banelingInst);const u=Jx();this.shamanAnimAttr=new Ti(this.shamanAnimData,4),this.shamanAnimAttr.setUsage(rn),u.setAttribute("aAnim",this.shamanAnimAttr);const f=Rs({roughness:.38,metalness:.26,emissive:2363448,emissiveIntensity:.08,shoulderY:.82,hipY:.38,rimColor:16109822});this.shamanInst=new Si(u,f,120),this.shamanInst.instanceMatrix.setUsage(rn),this.shamanInst.castShadow=!1,this.shamanInst.receiveShadow=!1,this.scene.add(this.shamanInst);const m=new Xe(1,1);m.rotateX(-Math.PI/2);const p=new le({map:Jh(),transparent:!0,opacity:.88,depthWrite:!1});this.unitShadowInst=new Si(m,p,Qe),this.unitShadowInst.instanceMatrix.setUsage(rn),this.scene.add(this.unitShadowInst),this.fxFlashEl=document.getElementById("fx-flash");const S=new Xt(.2,8,6),g=new le({color:16777215,transparent:!0,opacity:.9,depthWrite:!1});this.particleInst=new Si(S,g,pa),this.particleInst.instanceMatrix.setUsage(rn),this.scene.add(this.particleInst);const h=new Ei(.62,1,32);h.rotateX(-Math.PI/2);for(let w=0;w<Fr;w++){const y=new le({color:2672634,transparent:!0,opacity:0,side:Ae,depthWrite:!1}),C=new F(h,y);C.visible=!1,this.scene.add(C),this.shockwaves.push({active:!1,mesh:C,mat:y,life:0,maxLife:.4,maxRadius:2.5})}const b=new lt(1,1,28,16,1,!0);b.translate(0,14,0);for(let w=0;w<Or;w++){const y=new le({color:2672634,transparent:!0,opacity:0,side:Ae,blending:ka,depthWrite:!1}),C=new F(b,y);C.visible=!1,this.scene.add(C),this.skyPillars.push({active:!1,mesh:C,mat:y,life:0,maxLife:.45,maxRadius:1.8})}}applySkin(t){const e=t.palette;if(t.id==="azure"?(this.skinCandyTints[0].copy(this.candySkyBlue),this.skinCandyTints[1].copy(this.candyAppleGreen),this.skinCandyTints[2].copy(this.candyCoralPink)):(this.skinCandyTints[0].setHex(e.primary),this.skinCandyTints[1].setHex(e.accent),this.skinCandyTints[2].setHex(e.glow)),this.turretMuzzleLight&&this.turretMuzzleLight.color.setHex(e.glow),this.blueBodyInst){const n=this.blueBodyInst.geometry,s=this.state.getActiveRaceBranch().id,a=od(e,s);a.setAttribute("aAnim",this.blueAnimAttr),this.blueBodyInst.geometry=a,n.dispose()}if(this.championInst){const n=this.championInst.geometry,s=this.state.getActiveRaceBranch().id,a=rd(e,s);a.setAttribute("aAnim",this.champAnimAttr),this.championInst.geometry=a,n.dispose()}this.champMat&&this.champMat.emissive.setHex(e.emissive)}loadLevel(t){var P;this.currentLevel=t,this.applyTheme(this.customThemeOverride||t.themeId),this.applySkin(this.state.getEquippedSkin()),this.bossMaxHp=t.bossMaxHp,this.bossHp=t.bossMaxHp,this.bossBerserkTriggered=!1,this.bossShieldActive=!1,this.bossShieldHitsRemaining=0,this.bossShield70Triggered=!1,this.bossShield50Triggered=!1,this.bossShield35Triggered=!1,this.megaBossMeteorTimer=4.2,this.megaBossCurseTimer=9.5,this.megaBossSlamTimer=7.8,this.miniBossWarCryTimer=6.5,this.quakeTimer=0,this.quakeMaxTimer=0,this.quakeIntensity=0,this.skillWaveQueue=[],document.body.classList.remove("screen-quake-active"),this.bossShieldMesh&&(this.bossShieldMesh.visible=!1),this.megaBossCrownGroup.visible=!!t.isMegaBoss,this.bossGroup.position.set(0,-.4,t.isMegaBoss?Mt-1.4:Mt-1.8),this.bossGroup.rotation.set(0,0,0),this.victoryClimaxTimer=0,this.lastStageVictory=!1,this.victoryFireworkTimer=0,t.isMegaBoss&&(this.scene.background=new Tt(16038266),this.scene.fog=new Sa(15778963,.0046),this.bossEyeMat.color.setHex(16772565),(P=this.bossPortalMat)!=null&&P.uniforms&&(this.bossPortalMat.uniforms.uCoreColor.value.setHex(16347926),this.bossPortalMat.uniforms.uRingColor.value.setHex(16436245)),this.bossArmorMat.color.setHex(10369836),this.bossSecondaryMat.color.setHex(14196274));for(const x of this.meteorTelegraphs)x.active=!1,x.mesh.visible=!1;this.playerBaseMaxHp=Math.round(480*this.state.getPowerMultiplier()*this.state.getBaseHpMultiplier()),this.playerBaseHp=this.playerBaseMaxHp,this.lastKnownBaseHp=this.playerBaseMaxHp,this.baseDamageAccum=0,this.bastionShockwavesTriggered=0,this.skillOverdriveTimer=0,this.scorchedEarthTimer=0,this.scorchedEarthTickTimer=0,this.shotsFiredCounter=0,this.praetorianShotCounter=0,this.baseTurretTimer=.6,this.baseRegenTimer=0,this.swarmBroodTimer=3.8,this.gatePulseTimer=2.6,this.plasmaThunderTimer=2.4,this.orbitalStarfallTimer=3,this.bastionPeriodicWaveTimer=9.5,this.tycoonGoldMilestone=180,this.isOverrunFrenzy=!1,this.overrunTimer=0,this.isStageEnded=!1,this.elapsedTime=0,this.stageCombatTime=0,this.enemySpawnTimer=0,this.bruteSpawnTimer=2,this.shamanSpawnTimer=2.5,this.killStreakCount=0,this.killStreakWindowTimer=0,this.nextStreakMilestone=25,this.adrenalineTimer=0,xt.setBgmDanger(0);const e=this.state.getStartingSkillCharge();this.state.championCharge=100,this.state.orbitalCharge=Math.max(this.state.orbitalCharge,Math.floor(e*.45)),this.turretTargetX=0,this.turretX=0,this.turretGroup.position.x=0,this.state.stageClonesSpawned=0,this.state.stageMutantsKilled=0,this.state.stageGoldEarned=0;for(const x of this.units)x.active=!1;for(;this.levelGroup.children.length>0;){const x=this.levelGroup.children[0];x.traverse(M=>{const _=M;_.geometry&&_.geometry.dispose()}),this.levelGroup.remove(x)}this.labelsContainer.innerHTML="",this.enemyBaseWorldHpEl=void 0,this.enemyBaseWorldFillEl=void 0,this.enemyBaseWorldTextEl=void 0,this.playerBaseWorldHpEl=void 0,this.playerBaseWorldFillEl=void 0,this.playerBaseWorldTextEl=void 0,this.gates=[],this.gears=[],this.nests=[],this.barrels=[],this.wallRuntimes=[],this.zones=[],this.bumpers=[],this.walls=t.walls.map(x=>({...x})),this.syncTurretEvolution(!1),this.wasHoldingFire=!1,this.heroChargeFullNotified=!1,this.holdChargeParticleTimer=0,this.lootBug.active=!1,this.lootBug.spawnTimer=this.state.getSkillNodeRank("tycoon_t2")>0?4.2:6.8,this.lootBugGroup.visible=!1;const n=document.createElement("div");n.className="lootbug-label",n.style.display="none",this.labelsContainer.appendChild(n),this.lootBugLabelEl=n;const s=document.createElement("div");s.className="turret-charge-hud",s.style.display="none";const a=document.createElement("div");a.className="turret-charge-track";const o=document.createElement("div");o.className="turret-charge-fill",a.appendChild(o);const r=document.createElement("span");r.className="turret-charge-text",s.appendChild(a),s.appendChild(r),this.labelsContainer.appendChild(s),this.turretChargeEl=s,this.turretChargeFillEl=o,this.turretChargeTextEl=r;const l=te(new Ht({color:10904366,roughness:.44,metalness:.06}),.78),c=te(new Ht({color:13140550,roughness:.38,metalness:.05}),.72),d=te(new Ht({color:12735533,emissive:3870981,emissiveIntensity:.14,roughness:.38,metalness:.1}),.78),u=te(new Ht({color:4540756,roughness:.38,metalness:.45}),.76),f=te(new Ht({color:15248696,emissive:3875590,emissiveIntensity:.14,roughness:.26,metalness:.48}),.76);for(const x of this.walls){const M=new re,_=!!(x.moveRangeX&&x.moveSpeed),N=x.x2-x.x1,U=x.z2-x.z1,H=Math.hypot(N,U),z=Math.atan2(N,U),L=(x.x1+x.x2)/2,A=(x.z1+x.z2)/2,E=new F(new Nt(_?.72:.66,.38,Math.max(.4,H+.16)),_?d:l);E.position.set(L,.78,A),E.rotation.y=z,E.castShadow=!0,E.receiveShadow=!0,M.add(E);const I=new F(new Nt(_?.54:.48,.08,Math.max(.3,H+.04)),_?f:c);I.position.set(L,.99,A),I.rotation.y=z,M.add(I);for(const $ of[-1,1]){const Q=$*Math.max(.15,H*.5-.32),it=L+Math.sin(z)*Q,W=A+Math.cos(z)*Q,j=new F(new Nt(_?.78:.72,.44,.22),f);j.position.set(it,.78,W),j.rotation.y=z,M.add(j)}const V=H>6.8?2:1;for(let $=0;$<=V;$++){const Q=$/V,it=x.x1+N*Q,W=x.z1+U*Q,j=new F(new lt(.52,.62,.18,16),f);j.position.set(it,.09,W),j.castShadow=!0,M.add(j);const ht=new F(new lt(.28,.3,.68,12),u);ht.position.set(it,.45,W),ht.castShadow=!0,M.add(ht);for(const Pt of[.27,.44,.61]){const kt=new F(new ie(.37,.075,8,16),u);kt.position.set(it,Pt,W),kt.rotation.x=Math.PI/2+.09,M.add(kt)}const dt=new F(new lt(.45,.47,.2,16),_?d:l);dt.position.set(it,.88,W),dt.castShadow=!0,M.add(dt);const Rt=new F(new lt(.14,.14,.24,10),f);Rt.position.set(it,.89,W),M.add(Rt)}if(_&&x.moveRangeX){const $=H+x.moveRangeX*2+.6,Q=new F(new Nt($,.06,.46),u);Q.position.set(L,.03,A),this.levelGroup.add(Q);const it=new F(new Nt($-.16,.08,.14),f);it.position.set(L,.04,A),this.levelGroup.add(it)}this.levelGroup.add(M),this.wallRuntimes.push({cfg:x,group:M,baseX1:x.x1,baseX2:x.x2})}for(const x of t.zones||[]){const M=new re;M.position.set(x.x,.02,x.z);let _,N,U;if(x.type==="speed_belt"){const z=new F(new Nt(x.width-.16,.14,x.length),u);z.position.y=.07,z.castShadow=!0,z.receiveShadow=!0,M.add(z),_=this.createConveyorBeltTexture(),_.repeat.set(1,Math.max(1,Math.round(x.length/2.1)));const L=new Ht({map:_,roughness:.5,metalness:.1}),A=new F(new Xe(x.width-.34,x.length-.18),L);A.rotation.x=-Math.PI/2,A.position.y=.15,A.receiveShadow=!0,M.add(A);for(const E of[-1,1]){const I=new F(new lt(.12,.12,x.width-.18,12),u);I.rotation.z=Math.PI/2,I.position.set(0,.12,E*(x.length*.5-.06)),M.add(I)}for(const E of[-1,1]){const I=new F(new Nt(.2,.22,x.length+.08),u);I.position.set(E*(x.width*.5-.09),.11,0),I.castShadow=!0,M.add(I);for(const V of[-1,1]){const $=new F(new Nt(.28,.26,.42),f);$.position.set(E*(x.width*.5-.08),.13,V*(x.length*.5-.14)),$.castShadow=!0,M.add($)}}}else if(x.type==="jump_pad"){const z=Math.min(x.width,x.length)*.5,L=new F(new lt(z*.96,z*1.08,.18,20),f);L.position.y=.09,L.castShadow=!0,M.add(L);const A=new F(new ie(z*.72,.09,8,20),u);A.rotation.x=Math.PI/2,A.position.y=.2,M.add(A);const E=new F(new lt(z*.68,z*.72,.12,18),new Ht({color:16096779,emissive:7877903,emissiveIntensity:.25,roughness:.3,metalness:.35}));E.position.y=.26,M.add(E),N=new F(new Ei(z*.48,z*.86,24),new le({color:16707722,side:Ae,transparent:!0,opacity:.88})),N.rotation.x=-Math.PI/2,N.position.y=.33,M.add(N)}else if(x.type==="toxic_mire"){const z=kx(),L=new le({map:z,transparent:!0,alphaTest:.04,depthWrite:!1}),A=new F(new Xe(x.width*1.18,x.length*1.18),L);A.rotation.x=-Math.PI/2,A.position.y=.03,M.add(A)}else if(x.type==="heal_sanctuary"){const z=Math.min(x.width,x.length)*.48,L=new F(new lt(z,z*1.04,.05,24),new Ht({color:16502760,emissive:16020150,emissiveIntensity:.22,roughness:.35,metalness:.1}));L.position.y=.025,M.add(L),N=new F(new Ei(z*.74,z*.98,24),new le({color:16020150,side:Ae,transparent:!0,opacity:.9})),N.rotation.x=-Math.PI/2,N.position.y=.07,M.add(N),U=new re,U.position.set(0,.78,0);const A=new Ht({color:16020150,emissive:14362487,emissiveIntensity:.35,roughness:.22}),E=new F(new Xt(.22,12,10),A);E.position.set(-.1,-.18,0),U.add(E);const I=new F(new lt(.06,.06,.56,8),A);I.position.set(.06,.08,0),U.add(I);const V=new F(new Nt(.28,.14,.08),f);V.position.set(.18,.3,0),V.rotation.z=-.35,U.add(V),M.add(U)}const H=document.createElement("div");H.className=`zone-label zone-${x.type}`,H.innerHTML=x.type==="speed_belt"?`${Z.belt} 加速传送带`:x.type==="jump_pad"?`${Z.spring} 弹簧跳板`:x.type==="toxic_mire"?`${Z.oil} 黏滞油污`:`${Z.heart} 应援舞台`,this.labelsContainer.appendChild(H),this.levelGroup.add(M),this.zones.push({cfg:x,group:M,beltTex:_,ringMesh:N,holoCross:U,labelEl:H})}const m=te(new Ht({color:15248696,emissive:3875590,emissiveIntensity:.15,metalness:.48,roughness:.26}),.76),p=te(new Ht({color:16775403,roughness:.28,metalness:.06}),.74);for(const x of t.bumpers||[]){const M=new re;M.position.set(x.x,0,x.z);const _=new F(new lt(x.radius*.74,x.radius*.9,.76,16),m);_.position.y=.38,_.castShadow=!0,M.add(_);const N=new le({color:16346752}),U=new F(new ie(x.radius*.88,.14,10,20),N);U.rotation.x=Math.PI/2,U.position.y=.56,M.add(U);const H=new F(new Xt(x.radius*.68,16,10,0,Math.PI*2,0,Math.PI*.52),p);H.position.y=.74,M.add(H),this.levelGroup.add(M),this.bumpers.push({cfg:x,group:M,ringMat:N,pulseTimer:0})}const S=te(new Ht({color:10907678,metalness:.48,roughness:.3}),.76);for(const x of t.gates){const M=new re;M.position.set(x.x,0,x.z);const _=x.style==="mega"?2.22:1.88,N=te(new Ht({color:15248696,emissive:3875590,emissiveIntensity:.14,roughness:.24,metalness:.48}),.78);for(const I of[-1,1]){const V=I*x.width/2,$=new F(new lt(.46,.54,.16,16),N);$.position.set(V,.08,0),$.castShadow=!0,M.add($);const Q=new F(new lt(.35,.42,.16,16),S);Q.position.set(V,.22,0),M.add(Q);const it=new F(new lt(.21,.24,_,16),N);it.position.set(V,_*.5+.18,0),it.castShadow=!0,M.add(it);for(const ht of[.34,_+.12]){const dt=new F(new ie(.25,.05,8,16),S);dt.rotation.x=Math.PI/2,dt.position.set(V,ht,0),M.add(dt)}const W=new F(new Xt(.28,14,12),N);W.position.set(V,_+.36,0),W.castShadow=!0,M.add(W);const j=new F(new ie(.09,.028,6,12),S);j.position.set(V-I*.2,_-.02,0),M.add(j)}const U=new F(new lt(.14,.14,x.width+.16,14),N);U.rotation.z=Math.PI/2,U.position.set(0,_+.14,0),M.add(U);const H=new F(new ss(.26,0),N);H.scale.set(1.25,1.15,.65),H.position.set(0,_+.36,0),M.add(H);const z=`${x.op==="add"?"+":x.op==="mul"?"×":x.op==="div"?"÷":"-"}${x.value}`,L=new le({map:this.getGateBannerTexture(x.style,z),transparent:!0,opacity:.99,alphaTest:.05,side:Ae,depthWrite:!1}),A=new F(new Xe(Math.max(.5,x.width-.24),_-.06),L);A.position.set(0,_*.52+.08,0),M.add(A),this.levelGroup.add(M);const E=document.createElement("div");E.className=`gate-label ${x.style==="mega"?"mega-gate":x.style==="gold"?"gold-gate":x.style==="hazard"?"hazard-gate":""}`,E.textContent=z,this.labelsContainer.appendChild(E),this.gates.push({cfg:{...x},group:M,pillarMat:N,shieldMat:L,currentX:x.x,pulseTimer:0,addCooldown:0,chargeHits:0,labelEl:E})}if(this.state.getSkillNodeRank("gate_t4")>0){const x=this.gates.find(M=>M.cfg.op==="sub"||M.cfg.op==="div");x&&this.flipHazardGateToBlue(x)}const g=te(new Ht({color:4540756,roughness:.38,metalness:.45}),.78),h=te(new Ht({color:15248696,emissive:3875590,emissiveIntensity:.14,roughness:.26,metalness:.48}),.78);for(const x of t.gears){const M=new re;M.position.set(x.x,0,x.z);const _=te(new Ht({color:15692860,emissive:3870981,emissiveIntensity:.12,roughness:.28,metalness:.2}),.82),N=new F(new lt(x.radius*.94,x.radius*1.04,.22,20),g);N.position.y=.11,N.castShadow=!0,N.receiveShadow=!0,M.add(N);for(let V=0;V<8;V++){const $=V/8*Math.PI*2,Q=new F(new Nt(.28,.24,.34),h);Q.position.set(Math.cos($)*x.radius*.96,.14,Math.sin($)*x.radius*.96),Q.rotation.y=-$,M.add(Q)}const U=new F(new ie(x.radius*.82,.08,8,20),h);U.rotation.x=Math.PI/2,U.position.y=.24,M.add(U);const H=new F(new lt(x.radius*.8,x.radius*.84,.76,20),_);H.position.y=.6,H.castShadow=!0,M.add(H);const z=new F(new Xt(x.radius*.8,20,12,0,Math.PI*2,0,Math.PI*.52),_);z.position.y=.96,z.scale.set(1,.82,1),z.castShadow=!0,M.add(z);for(let V=0;V<10;V++){const $=V/10*Math.PI*2,Q=new F(new Xt(.065,8,6),h);Q.position.set(Math.cos($)*x.radius*.78,.96,Math.sin($)*x.radius*.78),M.add(Q)}const L=new F(new lt(.36,.44,.14,14),h);L.position.y=1.62,M.add(L);const A=new F(new lt(.18,.22,.28,12),g);A.position.y=1.82,M.add(A);const E=new F(new ie(.2,.04,6,12),h);if(E.rotation.x=Math.PI/2,E.position.y=1.95,M.add(E),this.levelGroup.add(M),x.moveRangeX&&x.moveRangeX>0){const V=x.moveRangeX*2+x.radius*1.4,$=new F(new Nt(V,.05,.48),g);$.position.set(x.x,.025,x.z),this.levelGroup.add($);const Q=new F(new Nt(V-.16,.07,.12),h);Q.position.set(x.x,.035,x.z),this.levelGroup.add(Q)}const I=document.createElement("div");I.className="gear-label",I.textContent=`${x.hp}`,this.labelsContainer.appendChild(I),this.gears.push({cfg:{...x},mesh:M,baseX:x.x,hp:x.hp,alive:!0,hitFlash:0,labelEl:I})}for(const x of t.nests){const M=new re;M.position.set(x.x,0,x.z);const _=te(new Ht({color:12736575,roughness:.62,metalness:.06}),.78),N=te(new Ht({color:15248696,roughness:.26,metalness:.48}),.78),U=new F(new lt(1.65,1.82,1.08,16),_);U.position.set(0,.54,0),U.castShadow=!0,M.add(U);const H=new F(new ie(1.68,.1,8,20),N);H.rotation.x=Math.PI/2,H.position.set(0,1.08,0),M.add(H);const z=new re;z.position.set(0,1.88,0);const L=te(new Ht({color:15099706,roughness:.34,metalness:.2}),.8),A=te(new Ht({color:4540756,roughness:.34,metalness:.45}),.8),E=new F(new Xt(.92,14,12),L);E.scale.set(1.05,1.1,.96),z.add(E);const I=new F(new Xt(.76,14,10,0,Math.PI*2,0,Math.PI*.52),A);I.position.set(0,.36,0),z.add(I);const V=new le({color:16707722});for(const j of[-.26,.26]){const ht=new F(new Xt(.14,8,8),V);ht.position.set(j,.26,.78),z.add(ht)}const $=new lt(.12,.16,.52,8),Q=new F($,N);Q.position.set(-.56,.85,-.1),Q.rotation.z=.28,z.add(Q);const it=new F($,N);it.position.set(.56,.85,-.1),it.rotation.z=-.28,z.add(it),M.add(z),this.levelGroup.add(M);const W=document.createElement("div");W.className="nest-label",W.textContent=`${x.hp}`,this.labelsContainer.appendChild(W),this.nests.push({cfg:x,group:M,monsterMesh:z,hp:x.hp,maxHp:x.hp,alive:!0,hitFlash:0,labelEl:W})}const b=te(new Ht({color:14697013,emissive:4524554,emissiveIntensity:.2,roughness:.34,metalness:.18}),.8),w=te(new Ht({color:15248696,roughness:.26,metalness:.48}),.78),y=new le({color:16707722});for(const x of t.barrels||[]){const M=new re;M.position.set(x.x,0,x.z);const _=new F(new lt(.6,.64,1.28,16),b);_.position.y=.64,_.castShadow=!0,M.add(_);const N=new F(new lt(.63,.63,.14,16),w);N.position.y=1.02,M.add(N);const U=new F(new lt(.64,.64,.14,16),w);U.position.y=.32,M.add(U);const H=new F(new Xt(.18,10,8),y);H.position.y=1.42,M.add(H);const z=new F(new Ei(.7,.88,20),new le({color:16498468,side:Ae}));z.rotation.x=-Math.PI/2,z.position.y=.03,M.add(z),this.levelGroup.add(M);const L=document.createElement("div");L.className="barrel-label",L.innerHTML=`${Z.barrel}<span>${x.hp}</span>`,this.labelsContainer.appendChild(L),this.barrels.push({cfg:x,mesh:M,hp:x.hp,alive:!0,labelEl:L})}if(t.isMegaBoss){xt.playBossRoar(),this.triggerContinuousQuake(1.35,1.38),this.triggerScreenFlash("#f97316",.68);for(const x of[-6,-3,0,3,6])this.spawnSkyPillar(x,Mt+1.2,16347926,3.2,.7);this.spawnShockwave(0,Mt+1.2,16347926,16.5,.75),this.spawnShockwave(0,Mt+1.2,16436245,11.5,.58),this.spawnUnit("red","brute",-3.6,Mt+1.8,0,3.2),this.spawnUnit("red","brute",3.6,Mt+1.8,0,3.2),this.spawnUnit("red","shaman",-1.8,Mt+1.5,0,2.9),this.spawnUnit("red","shaman",1.8,Mt+1.5,0,2.9)}else t.isMilestoneBoss&&(this.spawnSkyPillar(0,Mt+1,16436245,2.8,.6),this.spawnShockwave(0,Mt+1,16436245,11,.6));this.gates.length>=2&&(this.gates[0].cfg.op="add",this.gates[0].cfg.value=4,this.gates[0].cfg.style="blue",this.gates[0].cfg.x=-5.4,this.gates[0].cfg.z=-1.6,this.gates[0].cfg.width=5.2,this.gates[0].currentX=-5.4,this.gates[1].cfg.op="mul",this.gates[1].cfg.value=3,this.gates[1].cfg.style="blue",this.gates[1].cfg.x=3.8,this.gates[1].cfg.z=-4.2,this.gates[1].cfg.width=5.4,this.gates[1].currentX=3.8);const C=[[-6,-11.6],[6.8,-10.6]];for(const[x,M]of C){const _=this.spawnUnit("red","normal",x,M,0,2.2);_&&(_.spawnHop=0)}const v=this.spawnUnit("blue","champion",-3,0,0,-3.2);v&&(v.maxHp*=3.5,v.hp=v.maxHp,v.spawnHop=0);const T=[[-6.2,2],[-4.2,3.4],[-2.1,6],[-1,2.8],[-1.5,-3.2],[.6,-7.2],[4,-7.6]];for(const[x,M]of T){const _=this.spawnUnit("blue","normal",x,M,0,-4.5);_&&(_.spawnHop=0)}}getGateBannerTexture(t,e){const n=`${t}_${e}`;return this.gateTextures[n]||(this.gateTextures[n]=Tx(t,e)),this.gateTextures[n]}createConveyorBeltTexture(){const t=document.createElement("canvas");t.width=128,t.height=128;const e=t.getContext("2d");e.fillStyle="#3e7db5",e.fillRect(0,0,128,128),e.fillStyle="#316494";for(let s=0;s<128;s+=16)e.fillRect(0,s,128,4);e.fillStyle="#254c73",e.fillRect(0,0,12,128),e.fillRect(116,0,12,128),e.fillStyle="#3b1d0c",e.fillRect(11,0,3,128),e.fillRect(114,0,3,128);for(const s of[36,98])e.strokeStyle="#3b1d0c",e.lineWidth=19,e.lineCap="round",e.lineJoin="round",e.beginPath(),e.moveTo(28,s+16),e.lineTo(64,s-14),e.lineTo(100,s+16),e.stroke(),e.strokeStyle="#ffcb36",e.lineWidth=11,e.beginPath(),e.moveTo(28,s+16),e.lineTo(64,s-14),e.lineTo(100,s+16),e.stroke();const n=new In(t);return n.colorSpace=qe,n.wrapS=es,n.wrapT=es,n}toggleCameraMode(){return this.cameraMode=(this.cameraMode+1)%3,this.applyCameraTransform(),this.cameraMode===0?"斜向微缩":this.cameraMode===1?"经典俯视":"低空震撼"}applyCameraTransform(){const t=window.innerWidth/Math.max(1,window.innerHeight),e=t<1,n=e?Math.max(1,.72/Math.max(.46,t)):1;if(this.camera.aspect=t,this.cameraMode===0){this.camera.fov=e?56:50;const s=e?-.8:-2.2,a=e?-1.4:-1.6,o=e?4.8:5.4,r=(e?8.8:12.6)*n,l=(e?20.4:19.8)*n,c=(e?29.2:28.8)*n;this.camera.position.set(s+r,a+l,o+c),this.camera.lookAt(s,a,o)}else if(this.cameraMode===1){this.camera.fov=e?58:54;const s=e?-1.6:-2.2,a=e?5.8:6.6,o=(e?20.2:19.8)*n,r=(e?28:27.6)*n;this.camera.position.set(0,s+o,a+r),this.camera.lookAt(0,s,a)}else{this.camera.fov=e?50:45;const s=.8,a=.5;this.camera.position.set(0,s+10.2*n,a+30.5*n),this.camera.lookAt(0,s,a)}this.baseCameraPos.copy(this.camera.position),this.camera.updateProjectionMatrix()}addCameraShake(t){this.cameraShake=Math.min(1.85,this.cameraShake+t)}triggerContinuousQuake(t,e=1.4){this.quakeTimer=Math.max(this.quakeTimer,t),this.quakeMaxTimer=Math.max(this.quakeMaxTimer,t),this.quakeIntensity=Math.max(this.quakeIntensity,e),this.cameraShake=Math.max(this.cameraShake,e),document.body.classList.add("screen-quake-active")}triggerScreenFlash(t,e=.65){this.fxFlashEl&&(this.fxFlashEl.style.background=`radial-gradient(circle at 50% 50%, ${t} 0%, transparent 78%)`,this.fxFlashEl.style.opacity=`${e}`,setTimeout(()=>{this.fxFlashEl&&(this.fxFlashEl.style.opacity="0")},60))}spawnSkyPillar(t,e,n,s=1.8,a=.45){this.spawnCombatLight(t,2.6,e,n,Math.min(14,s*4.5),16,a);for(let o=0;o<Or;o++){const r=this.skyPillars[o];if(!r.active){r.active=!0,r.life=0,r.maxLife=a,r.maxRadius=s,r.mat.color.setHex(n),r.mat.opacity=.92,r.mesh.position.set(t,0,e),r.mesh.scale.set(s*.25,1,s*.25),r.mesh.visible=!0;return}}}spawnShockwave(t,e,n,s=2.6,a=.38){s>=2.8&&this.spawnCombatLight(t,1.6,e,n,Math.min(11,s*1.8),13,a);for(let o=0;o<Fr;o++){const r=this.shockwaves[o];if(!r.active){r.active=!0,r.life=0,r.maxLife=a,r.maxRadius=s,r.mat.color.setHex(n),r.mat.opacity=.95,r.mesh.position.set(t,.14,e),r.mesh.scale.set(.25,.25,.25),r.mesh.visible=!0;return}}}isHoldingFireInput(){return this.isPaused||this.isStageEnded?!1:this.isPointerDown||this.keysDown.has("Space")||this.keysDown.has("KeyW")||this.keysDown.has("ArrowUp")}isSteeringInput(){return this.isPaused||this.isStageEnded?!1:this.keysDown.has("KeyA")||this.keysDown.has("KeyD")||this.keysDown.has("ArrowLeft")||this.keysDown.has("ArrowRight")}bindInput(){const t=(s,a)=>{const o=this.canvas.getBoundingClientRect();if(o.width<=768){const p=((s-o.left)/Math.max(1,o.width)-.5)/.82;this.turretTargetX=jt.clamp(p*(ue-1.2)*2,-ue+1.2,ue-1.2);return}const r=-ue+1.2,l=ue-1.2,c=(s-o.left)/Math.max(1,o.width)*2-1;this.tempVec.set(r,.8,wt).project(this.camera);const d=this.tempVec.x;this.tempVec.set(l,.8,wt).project(this.camera);const u=this.tempVec.x,f=Math.abs(u-d)>.04?u-d:1,m=jt.clamp((c-d)/f,0,1);this.turretTargetX=jt.lerp(r,l,m)},e=()=>{const s=(this.isPointerDown||this.wasHoldingFire)&&!this.isPaused&&!this.isStageEnded&&this.state.championCharge>=100;this.isPointerDown=!1,this.isHoldingFireInput()||(this.wasHoldingFire=!1),s&&this.deployChampion()&&this.spawnFloatingPopup(this.turretX,2.5,wt-1.2,"⚡ 松手召唤英雄!","#facc15")};this.canvas.addEventListener("pointerdown",s=>{s.button!==void 0&&s.button!==0||(this.isPointerDown=!0,this.wasHoldingFire=!0,t(s.clientX,s.clientY))}),window.addEventListener("pointermove",s=>{this.isPointerDown&&t(s.clientX,s.clientY)}),window.addEventListener("pointerup",()=>{e()}),window.addEventListener("pointercancel",()=>{this.isPointerDown=!1,this.isHoldingFireInput()||(this.wasHoldingFire=!1)}),this.canvas.addEventListener("touchstart",s=>{s.touches.length>0&&(this.isPointerDown=!0,this.wasHoldingFire=!0,t(s.touches[0].clientX,s.touches[0].clientY))},{passive:!0}),this.canvas.addEventListener("touchmove",s=>{s.touches.length>0&&(s.preventDefault(),t(s.touches[0].clientX,s.touches[0].clientY))},{passive:!1}),window.addEventListener("touchend",()=>{e()}),window.addEventListener("keydown",s=>{var o;if(s.ctrlKey||s.altKey||s.metaKey)return;const a=(o=document.activeElement)==null?void 0:o.tagName;a==="INPUT"||a==="TEXTAREA"||a==="SELECT"||(this.keysDown.add(s.code),!(this.isPaused||this.isStageEnded)&&(s.code==="Space"?(s.preventDefault(),!s.repeat&&this.state.championCharge>=100?(this.wasHoldingFire=!1,this.deployChampion()):this.wasHoldingFire=!0):s.code==="KeyW"||s.code==="ArrowUp"?this.wasHoldingFire=!0:s.code==="KeyQ"?(s.preventDefault(),this.triggerOrbitalStrike()):(s.code==="KeyS"||s.code==="ArrowDown")&&(this.turretTargetX=0)))}),window.addEventListener("keyup",s=>{const a=s.code==="Space"||s.code==="KeyW"||s.code==="ArrowUp";if(this.keysDown.delete(s.code),a&&!this.isHoldingFireInput()){const o=this.wasHoldingFire&&!this.isPaused&&!this.isStageEnded&&this.state.championCharge>=100;this.wasHoldingFire=!1,o&&this.deployChampion()&&this.spawnFloatingPopup(this.turretX,2.5,wt-1.2,"⚡ 松手召唤英雄!","#facc15")}});const n=()=>{var o,r;const s=window.devicePixelRatio||1,a=this.lowSpecMode?1:this.usePostProcessing?this.isMobileDevice?Math.min(s,1.35):Math.min(Math.max(s,1.5),2.25):Math.min(s,1.5);this.renderer.setPixelRatio(a),this.renderer.setSize(window.innerWidth,window.innerHeight),this.composer.setPixelRatio(a),this.composer.setSize(window.innerWidth,window.innerHeight),this.bloomPass.resolution.set(Math.floor(window.innerWidth*a*.5),Math.floor(window.innerHeight*a*.5)),(r=(o=this.cinemaPass)==null?void 0:o.uniforms)!=null&&r.uResolution&&this.cinemaPass.uniforms.uResolution.value.set(window.innerWidth*a,window.innerHeight*a),this.applyCameraTransform()};window.addEventListener("resize",n),window.addEventListener("orientationchange",()=>setTimeout(n,120))}spawnUnit(t,e,n,s,a=0,o=0,r,l=!1,c){var S;let d=null;for(let g=0;g<Qe;g++)if(!this.units[g].active){d=this.units[g];break}if(!d)return null;const u=t==="blue"?this.state.getPowerMultiplier():1,f=this.state.getChampionMultiplier(),m=t==="blue"?this.state.getGiantTrooperSpec():null;d.active=!0,d.id=this.nextUnitId++,d.team=t,d.kind=e,d.mechaType=e==="champion"?this.state.mechaMode:void 0,d.isMiniGiant=l||!!(m!=null&&m.isGiantMode&&e!=="champion");const p=m!=null&&m.isGiantMode&&m.t4DirectTier2Chance>0&&Math.random()<m.t4DirectTier2Chance?2:(m==null?void 0:m.startFusionTier)||1;if(d.fusionTier=t==="blue"&&e!=="champion"?c??(m!=null&&m.isGiantMode?p:l?1:0):0,d.fusionCooldown=r&&r.size>0?1.15:.45,d.empTimer=0,d.x=jt.clamp(n,-ue+.6,ue-.6),d.z=s,d.vx=a,d.vz=o,d.yaw=Math.atan2(a,o!==0?o:t==="blue"?-1:1),d.turnRate=0,d.walkPhase=d.id*1.37%(Math.PI*2),d.attackAnim=0,d.spawnHop=r&&r.size>0?1.35:.45,d.age=0,d.attackCooldown=0,d.specialTimer=0,d.passedGates.clear(),r)for(const g of r)d.passedGates.add(g);if(t==="blue"){const g=this.state.getMoveSpeedMultiplier(),h=this.state.getSwarmTrooperSpec(),b=this.state.getBastionTrooperSpec(),w=1+this.state.getSkillNodeRank("plasma_t1")*.16;if(this.state.stageClonesSpawned++,e==="champion"){const y=d.mechaType||"hammer";d.maxHp=(y==="aegis"?320:y==="pyro"?210:245)*f,d.hp=d.maxHp,d.dmg=(y==="hammer"?58:y==="pyro"?38:42)*f,d.radius=.72,d.speed=(y==="pyro"?7.4:6.8)*g}else if(m!=null&&m.isGiantMode){const y=Math.max(1,d.fusionTier||1),C=this.computeGiantTierStats(y,e==="charged");y>=2&&(d.kind="charged"),d.maxHp=C.maxHp,d.hp=d.maxHp,d.dmg=C.dmg,d.radius=C.radius,d.speed=(6.6+y*.14)*g}else l?(d.maxHp=52*u*b.trooperHpMult,d.hp=d.maxHp,d.dmg=30*u,d.radius=.46,d.speed=7.5*g):e==="charged"?(d.maxHp=38*u*h.hpMult*b.trooperHpMult,d.hp=d.maxHp,d.dmg=26*u*h.dmgMult*w,d.radius=h.isSwarmMode?.3:.34,d.speed=(this.state.getSkillNodeRank("plasma_t1")>0?8.5:8)*g):(d.maxHp=16*u*h.hpMult*b.trooperHpMult,d.hp=d.maxHp,d.dmg=12*u*h.dmgMult,d.radius=h.isSwarmMode?.27:.31,d.speed=7.4*g)}else{const g=Math.max(1,((S=this.currentLevel)==null?void 0:S.id)||1),h=Math.pow(1.135,Math.min(40,g-1)),b=Math.pow(1.095,Math.min(40,g-1));e==="brute"?(d.maxHp=Math.round((125+g*28)*h),d.hp=d.maxHp,d.dmg=Math.round((25+(g-1)*2.4)*b),d.radius=.75,d.speed=Math.min(4.2,3.15+(g-1)*.032)):e==="baneling"?(d.maxHp=Math.max(11,Math.round((12+(g-1)*1.6)*h)),d.hp=d.maxHp,d.dmg=Math.round((15+(g-1)*1.5)*b),d.radius=.34,d.speed=Math.min(5.6,4.55+(g-1)*.038)):e==="shaman"?(d.maxHp=Math.round((58+g*12)*h),d.hp=d.maxHp,d.dmg=Math.round((16+(g-1)*1.5)*b),d.radius=.46,d.speed=Math.min(4,3.05+(g-1)*.025)):(d.maxHp=Math.round((21+(g-1)*2.4)*h),d.hp=d.maxHp,d.dmg=Math.round((14+(g-1)*1.4)*b),d.radius=.31,d.speed=Math.min(4.6,3.55+(g-1)*.035))}return d}findDensestRedCluster(t,e,n){const s=[];if(this.activeRedIndices.length>0)for(let m=0;m<this.activeRedIndices.length;m++){const p=this.units[this.activeRedIndices[m]];p&&p.active&&p.team==="red"&&s.push(p)}else for(let m=0;m<Qe;m++){const p=this.units[m];p.active&&p.team==="red"&&s.push(p)}const a=s.length;if(a===0)return{x:jt.clamp(this.turretX*.5,-5.5,5.5),z:-1.5,count:0};const o=Math.max(1.8,t),r=Math.max(1.8,e),l=Math.max(1,Math.floor(a/64));let c=-1,d=s[0].x,u=s[0].z,f=1;for(let m=0;m<a;m+=l){const p=s[m];if(n){const y=p.x-n.x,C=p.z-n.z;if(y*y+C*C<n.minDist*n.minDist)continue}let S=0,g=0,h=0,b=0,w=0;for(let y=0;y<a;y++){const C=s[y],v=C.x-p.x,T=C.z-p.z;if(Math.abs(v)>o||Math.abs(T)>r)continue;const P=v/o*(v/o)+T/r*(T/r);if(P>1.15)continue;const x=C.kind==="brute"?3:C.kind==="shaman"?2.6:C.kind==="baneling"?1.35:1,M=1.15-.3*Math.min(1,P),_=1+Math.max(0,(C.z+20)*.008),N=x*M*_;S+=N,g+=C.x*N,h+=C.z*N,b+=N,w++}S>c&&b>0&&(c=S,d=g/b,u=h/b,f=w)}return{x:jt.clamp(d,-ue+1,ue-1),z:jt.clamp(u,Mt+1,wt-1.8),count:f}}deployChampion(){var y;if(this.state.championCharge<100||this.isStageEnded)return!1;this.state.championCharge=0,this.mascotCheerBoost=1.5,xt.playChampionSpawn();const t=this.state.getMechaSpec(),e=this.state.getUltimateEvolutionSpec(),n=this.state.getSkillNodeRank("titan_t4")>0,s=4.6*e.radiusMult,a=this.findDensestRedCluster(s,s),o=a.count>0?jt.clamp(jt.lerp(this.turretX,a.x,.72),-ue+1.5,ue-1.5):this.turretX,r=a.count>0?a.x:o,l=a.count>0?a.z:wt-1.6,c=this.spawnUnit("blue","champion",n?o-1.35:o,wt-1.6,n?-.6:0,-9);if(n){const C=this.spawnUnit("blue","champion",o+1.35,wt-1.6,.6,-9);C&&(C.mechaType=t.id==="hammer"?"pyro":(t.id==="pyro","hammer"),C.maxHp*=.45,C.hp=C.maxHp,C.dmg*=.45),this.spawnSkyPillar(o+1.35,wt-1.6,16347926,3.4,.65),this.spawnFloatingPopup(o,2.8,wt-2,"👑 双子神机协同降临!","#facc15")}const d=this.state.getSkillNodeRank("orbital_t3");d>0&&(this.skillOverdriveTimer=Math.max(this.skillOverdriveTimer,1.5+d*1.3),this.state.orbitalCharge=Math.min(100,this.state.orbitalCharge+8+d*6));const u=this.state.getCommittedSkillBranch(),m=u?{swarm:{hex:3718648,css:"#38bdf8"},titan:{hex:16347926,css:"#f97316"},gate:{hex:2282478,css:"#22d3ee"},plasma:{hex:16436245,css:"#facc15"},orbital:{hex:14239471,css:"#d946ef"},bastion:{hex:4906624,css:"#4ade80"},tycoon:{hex:16436245,css:"#facc15"}}[u.id]:void 0,p=m?m.hex:t.id==="pyro"?16347926:t.id==="aegis"?2278750:61695,S=m?m.css:t.id==="pyro"?"#f97316":t.id==="aegis"?"#22c55e":"#00f0ff";e.tier===0?(this.addCameraShake(.32),this.triggerScreenFlash(S,.26),this.spawnShockwave(o,wt-1.6,p,3,.32),this.spawnBurstParticles(o,1,wt-1.6,p,14)):e.tier===1?(this.triggerContinuousQuake(.45,.72),this.triggerScreenFlash(S,.42),this.spawnSkyPillar(o,wt-1.6,p,1.9,.42),this.spawnShockwave(o,wt-1.6,p,5.2,.45),this.spawnBurstParticles(o,1.1,wt-1.6,p,36)):e.tier===2?(this.triggerContinuousQuake(.85,1.05),this.triggerScreenFlash(S,.62),this.spawnSkyPillar(o,wt-1.6,p,2.7,.54),this.spawnShockwave(o,wt-1.6,p,7.2,.52),this.spawnShockwave(r,l,16436245,4.4,.38),this.spawnBurstParticles(o,1.2,wt-1.6,p,64)):(this.triggerContinuousQuake(1.45,1.42),this.triggerScreenFlash(S,.82),this.spawnSkyPillar(o,wt-1.6,p,3.8,.65),this.spawnSkyPillar(r-2.6,l,16436245,2.1,.52),this.spawnSkyPillar(r+2.6,l,16436245,2.1,.52),this.spawnBurstParticles(o,1.2,wt-1.6,p,95),this.spawnBurstParticles(r,1.6,l,16436245,55),this.spawnShockwave(o,wt-1.6,p,9.5,.62),this.spawnShockwave(r,l,16777215,6.4,.48),this.spawnShockwave(r,l,16436245,3.8,.36)),c&&c.active&&this.triggerHammerSlam(c,!0,a.count>0?{x:r,z:l}:void 0),[.22,.46,.72,1].slice(0,e.hammerAftershockWaves).forEach((C,v)=>{this.skillWaveQueue.push({delay:C,exec:()=>{const T=3+e.tier*.85,P=this.findDensestRedCluster(T,T),x=P.count>0?P.x:c&&c.active?c.x:this.turretX,M=P.count>0?P.z:c&&c.active?c.z-.8:wt-3.2-v*2.5;xt.playExplosion(),this.addCameraShake(e.isCompleteForm?.95:.55),e.isCompleteForm&&(this.triggerScreenFlash(v%2===0?S:"#facc15",.55),this.spawnSkyPillar(jt.clamp(x-3.4,-9.5,9.5),M-.8,16436245,1.8,.45),this.spawnSkyPillar(jt.clamp(x+3.4,-9.5,9.5),M-.8,16436245,1.8,.45)),this.spawnSkyPillar(x,M,p,1.8+e.tier*.35,.45);const _=4.8+e.tier*1.9;this.spawnShockwave(x,M,p,_,.48),this.spawnBurstParticles(x,1.1,M,p,24+e.tier*14);const N=T*T,U=.1+e.tier*.05;for(let H=0;H<Qe;H++){const z=this.units[H];!z.active||z.team!=="red"||(z.x-x)**2+(z.z-M)**2<=N&&(z.hp-=z.maxHp*U,z.vz-=3.5+e.tier*.7,z.hp<=0&&(z.active=!1,this.onUnitKilled(z)))}}})});const b=u?`【${e.badge}·${u.hammerMorphName}】`:`【${e.badge}·${t.name}】`,w=e.tier===0?"已精准锁定敌群密集区 · 升级技能树与局内泰坦解锁【👑完全体】全屏威能！":u?u.hammerMorphDesc:"连环震波已锁定敌群密集区 · 全线碾压推进！";return(y=this.onBanner)==null||y.call(this,`${t.icon} ${b}出击！`,w),!0}triggerOrbitalStrike(){var M;if(this.state.orbitalCharge<100||this.isStageEnded)return!1;this.state.orbitalCharge=0,xt.playOrbitalStrike();const t=this.state.getUltimateEvolutionSpec(),e=this.state.getCommittedSkillBranch(),n=e==null?void 0:e.id,s=this.state.getSkillNodeRank("orbital_t2"),a=this.state.getSkillNodeRank("orbital_t3");a>0&&(this.skillOverdriveTimer=Math.max(this.skillOverdriveTimer,1.5+a*1.3),this.state.championCharge=Math.min(100,this.state.championCharge+8+a*6));const o=this.state.getSkillNodeRank("orbital_t4")>0;(o||n==="orbital"&&t.tier>=2)&&(this.scorchedEarthTimer=o?4.5:2,this.scorchedEarthTickTimer=.35);const r=this.findDensestRedCluster(t.orbitalXHalfSpan,t.orbitalZHalfSpan),l=r.x,c=r.z,d=this.findDensestRedCluster(t.orbitalXHalfSpan,t.orbitalZHalfSpan,{x:l,z:c,minDist:4.8}),u=_=>jt.clamp(_,-ue+1,ue-1),f=_=>jt.clamp(_,Mt+1,wt-1.8),p=n&&{swarm:{flash:"#38bdf8",c1:3718648,c2:3003583},titan:{flash:"#f97316",c1:16347926,c2:16436245},gate:{flash:"#22d3ee",c1:2282478,c2:14239471},plasma:{flash:"#facc15",c1:16436245,c2:61695},orbital:{flash:"#d946ef",c1:14239471,c2:61695},bastion:{flash:"#4ade80",c1:4906624,c2:16436245},tycoon:{flash:"#facc15",c1:16436245,c2:16707722}}[n]||{flash:"#d946ef",c1:14239471,c2:61695};if(t.tier===0)this.addCameraShake(.38),this.triggerScreenFlash(p.flash,.28),this.spawnSkyPillar(l,c,p.c1,1.55,.44),this.spawnSkyPillar(u(l+1.15),f(c-1.1),p.c2,1.15,.36),this.spawnShockwave(l,c,p.c1,5.2,.42),this.spawnBurstParticles(l,1,c,p.c1,24);else if(t.tier===1){this.triggerContinuousQuake(.65,.85),this.triggerScreenFlash(p.flash,.48),this.spawnShockwave(l,c,p.c1,9.2,.52);for(const[_,N,U]of[[l,c,p.c1],[u(l-2.6),f(c-1.8),p.c2],[u(l+2.6),f(c-1.8),p.c2],[d.x,d.z,16436245]])this.spawnSkyPillar(_,N,U,2,.48),this.spawnShockwave(_,N,U,4.2,.42),this.spawnBurstParticles(_,1.1,N,U,24)}else if(t.tier===2){this.triggerContinuousQuake(1.15,1.2),this.triggerScreenFlash(p.flash,.68),this.spawnShockwave(l,c,p.c1,12.8,.62),this.spawnShockwave(d.x,d.z,p.c2,10.2,.54);for(const[_,N,U]of[[l,c,p.c1],[u(l-3.6),f(c-2.5),p.c2],[u(l+3.6),f(c-2.5),p.c2],[u(l-3.2),f(c+2.5),p.c1],[u(l+3.2),f(c+2.5),p.c1],[d.x,d.z,16436245]])this.spawnSkyPillar(_,N,U,2.5,.56),this.spawnShockwave(_,N,U,5.2,.48),this.spawnBurstParticles(_,1.2,N,U,32)}else{this.triggerContinuousQuake(2.05,1.62),this.triggerScreenFlash(p.flash,.9),this.spawnShockwave(l,c,p.c1,16,.72),this.spawnShockwave(0,-8,p.c2,13.5,.64),this.spawnShockwave(0,6,16436245,11.5,.58);const _=[[l,c,p.c1],[d.x,d.z,16436245],[-5.2,-9,p.c2],[5.2,-9,p.c2],[0,-11,16436245],[-5,4,p.c1],[5,4,p.c1],[0,0,p.c2]];for(const[N,U,H]of _)this.spawnSkyPillar(N,U,H,3,.65),this.spawnShockwave(N,U,H,6.2,.54),this.spawnBurstParticles(N,1.2,U,H,42)}this.bossShieldActive&&t.tier>=1?this.shatterBossShield():this.bossShieldActive&&(this.bossShieldHitsRemaining=Math.max(1,this.bossShieldHitsRemaining-6));const S=n==="tycoon"?1.8+this.state.getSkillNodeRank("tycoon_t1")*.4:.5,g=(n==="titan"?1.6:n==="orbital"?1.45:1)*t.dmgMult,h=this.state.getPowerMultiplier(),b=t.tier===0?52*h:t.tier===1?115*h:999999,w=(_,N,U,H,z)=>{let L=0;const A=_??l,E=N??c;for(const I of this.units)if(!(!I.active||I.team!=="red")&&!(_!==null&&Math.abs(I.x-_)>U)&&!(N!==null&&Math.abs(I.z-N)>H))if(I.kind==="brute"||I.kind==="shaman"){const V=Math.max(15,I.maxHp*.24);I.hp>V&&(I.hp=Math.max(V,I.hp-I.maxHp*z*g)),(s>0||n==="plasma"||n==="orbital")&&(I.empTimer=Math.max(I.empTimer||0,Math.max(2,s*1.4))),n==="orbital"&&(I.x=jt.lerp(I.x,A,.28+t.tier*.08),I.z=jt.lerp(I.z,E,.22+t.tier*.05),I.spawnHop=1.1),I.vz-=1.4+t.tier*.4,this.spawnBurstParticles(I.x,1.2,I.z,p.c1,6+t.tier*2)}else I.hp-=b,I.hp<=0?(I.active=!1,L++,Math.random()<.55&&this.spawnBurstParticles(I.x,.7,I.z,p.c1,4+t.tier)):(I.vz-=2.2,I.spawnHop=.75);return L>0&&(this.state.stageMutantsKilled+=L,this.state.addGold(Math.max(1,Math.floor(L*S)))),L},y=t.tier===0?.045:t.tier===1?.065:.085,C=w(t.tier>=3?null:l,t.tier>=3?null:c,t.orbitalXHalfSpan,t.orbitalZHalfSpan,y);r.count>0&&t.tier<3&&this.spawnFloatingPopup(l,2.4,c,`🎯 锁定敌群密集区 -${C}!`,"#facc15");let v=`☄️ 【${t.badge}·天基轰炸】-${C}`,T=t.tier===0?"已精准轰炸敌群最密集处 · 升级解锁【👑完全体】全屏歼星洗地！":"高能轨道精准打击 · 重装精英巨兽血量削减！";if(n==="swarm"){const _=this.state.getSkillNodeRank("swarm_t1"),N=this.state.getSkillNodeRank("swarm_t2"),U=this.state.getSkillNodeRank("swarm_t4")>0,H=Math.max(3,Math.round((4+_*2+N*2)*(.55+t.tier*.22)));for(let z=0;z<H;z++){const L=u(l+(z%4-1.5)*1.35+(Math.random()-.5)*.5),A=f(c+1.4-Math.floor(z/4)*1.8+(Math.random()-.5)*.6),E=this.spawnUnit("blue",U?"charged":"normal",L,A,(Math.random()-.5)*1.5,-8.8);E&&(E.spawnHop=1.55)}this.spawnFloatingPopup(l,3,c,`🌊 深空虫群空投雨[${t.badge}] +${H}名克隆兵!`,"#38bdf8"),v=`🌊 【${t.badge}·深空虫群空投雨】-${C}`,T=`在敌群密集处空降 ${H} 名克隆敢死队${t.isCompleteForm?" · 👑完全体全屏空投！":"！"}`}else if(n==="titan"){const _=this.state.getSkillNodeRank("titan_t2"),N=this.state.getSkillNodeRank("titan_t3"),U=this.state.getSkillNodeRank("titan_t4")>0,H=t.tier>=2?2:1,z=t.tier===0?1:t.tier===1?2:2+(U?1:0);for(let I=0;I<z;I++){const V=z===1?l:u(l+(I-(z-1)*.5)*2.6),$=f(c+.8-I%2*1.2);this.spawnSkyPillar(V,$,16347926,1.8+t.tier*.3,.5),this.spawnShockwave(V,$,16436245,3.6+t.tier*.5,.42);const Q=this.spawnUnit("blue","charged",V,$,0,-8,void 0,!0,H);Q&&(Q.spawnHop=1.55)}const L=this.state.getGiantTrooperSpec(),A=t.tier===0?1:1+Math.ceil((_+N)*.5)+(U?1:0);let E=0;for(const I of this.activeBlueIndices){if(E>=A)break;const V=this.units[I];if(!V.active||V.kind==="champion")continue;const $=V.fusionTier||1;$<L.maxFusionTier&&(this.promoteGiantUnit(V,$+1,V.maxHp*.5,V.dmg*.5,V.hp*.65,E<2),E++)}this.spawnFloatingPopup(l,3.2,c,`🗿 远古巨神天降[${t.badge}] +${z}巨神 & ${E}升阶!`,"#f97316"),v=`🗿 【${t.badge}·远古巨神天降】-${C}`,T=`在敌群密集处空降 ${z} 尊${H}阶巨神 · 桥面 ${E} 名巨人升阶！`}else if(n==="gate"){const _=this.state.getSkillNodeRank("gate_t2"),N=this.state.getSkillNodeRank("gate_t4")>0,U=this.state.getMaxBlueGateCap();let H=0,z=0;const L=t.tier===0?1:t.tier===1?2:99;for(const A of this.gates){if(A.cfg.op==="sub"||A.cfg.op==="div")H<L&&(this.flipHazardGateToBlue(A),H++);else if(A.cfg.op==="add"){const I=N?2:1,V=Math.min(U,A.cfg.value+I);V>A.cfg.value&&(A.cfg.value=V,this.syncBlueGateVisualStyle(A)),A.pulseTimer=1.3,this.spawnShockwave(A.currentX,A.cfg.z,2282478,3.6+t.tier*.4,.42)}const E=Math.max(1,Math.round((1+_+t.tier)*.8));for(let I=0;I<E;I++){const V=A.currentX+(Math.random()-.5)*A.cfg.width*.7;this.spawnUnit("blue",N?"charged":"normal",V,A.cfg.z-.4,(Math.random()-.5)*3,-8.5),z++}}this.spawnFloatingPopup(l,3,c,`🚪 真理炼金逆转光[${t.badge}] 喷涌+${z}兵!`,"#22d3ee"),v=`🚪 【${t.badge}·真理炼金逆转光】转门×${H}`,T=`蓝门升阶 · 矩阵门脉同步喷涌 +${z} 名克隆兵！`}else if(n==="plasma"){const _=this.state.getSkillNodeRank("plasma_t1"),N=this.state.getSkillNodeRank("plasma_t4")>0,U=N?999:3+_*4+t.tier*3;let H=0;for(const z of this.activeBlueIndices){if(H>=U)break;const L=this.units[z];!L.active||L.kind!=="normal"||(L.kind="charged",L.maxHp*=1.9,L.hp=L.maxHp,L.dmg*=1.85,L.spawnHop=1.2,H++,H<=14&&this.spawnBurstParticles(L.x,.9,L.z,16436245,6))}(N||t.tier>=2)&&this.triggerThorSuperRailgun(),this.spawnFloatingPopup(l,3,c,`⚡ 九天雷暴超导网[${t.badge}] 进化+${H}兵!`,"#facc15"),v=`⚡ 【${t.badge}·九天雷暴超导网】-${C}`,T=`场上 ${H} 名士兵瞬间进化为黄金超导电浆兵！`}else if(n==="orbital")this.spawnSkyPillar(l,c,14239471,2.4+t.tier*.9,.65),this.spawnShockwave(l,c,14239471,7.5+t.tier*3,.6),this.spawnFloatingPopup(l,3.2,c,`☄️ 灭世黑洞焦土炮[${t.badge}] 聚怪激活!`,"#e879f9"),v=`☄️ 【${t.badge}·灭世黑洞焦土炮】-${C}`,T=t.isCompleteForm?"👑完全体黑洞引力聚怪 · 全屏等离子火海持续焚烧！":"黑洞引力锁定敌群密集处聚怪 · 施加EMP高额易伤！";else if(n==="bastion"){const _=this.state.getSkillNodeRank("bastion_t1"),N=this.state.getSkillNodeRank("bastion_t2"),U=this.state.getSkillNodeRank("bastion_t3"),H=this.state.getSkillNodeRank("bastion_t4")>0,z=Math.round(this.playerBaseMaxHp*(.08+_*.05+t.tier*.04));this.playerBaseHp=Math.min(this.playerBaseMaxHp,this.playerBaseHp+z),this.lastKnownBaseHp=Math.max(this.lastKnownBaseHp,this.playerBaseHp);for(const A of this.activeBlueIndices){const E=this.units[A];E.active&&(E.hp=Math.min(E.maxHp,E.hp+E.maxHp*(.4+t.tier*.2)))}for(const A of this.gears)A.alive&&(U>0||H||t.tier>=2?(A.hp=0,A.alive=!1,A.mesh.visible=!1,A.labelEl.style.display="none",this.spawnShockwave(A.cfg.x,A.cfg.z,4906624,4.2,.42)):A.hp=Math.max(1,Math.floor(A.hp*.55)));const L=1+Math.floor((N+t.tier)*.8)+(H?2:0);for(let A=0;A<L;A++){const E=L===1?l:u(l+(A-(L-1)*.5)*2.2),I=this.spawnUnit("blue","charged",E,wt-2.6,0,-8.8,void 0,A===Math.floor(L/2));I&&(I.spawnHop=1.45)}this.spawnFloatingPopup(l,2.8,wt-2.5,`🛡️ 圣光天降禁卫军[${t.badge}] +${z}HP & ${L}禁卫!`,"#4ade80"),v=`🛡️ 【${t.badge}·圣光天降禁卫军】+${z}HP`,T=`防线修复 · ${L} 名黄金禁卫军空降参战！`}else if(n==="tycoon"){const _=this.state.getSkillNodeRank("tycoon_t1"),N=this.state.getSkillNodeRank("tycoon_t4")>0,U=this.state.addGold(Math.round((25+_*22)*(.65+t.tier*.25)));if(this.lootBug.active?(this.lootBug.hp=Math.max(1,this.lootBug.hp-(2+t.tier)),this.lootBug.hitFlash=1):(this.lootBug.active=!0,this.lootBug.dirX=1,this.lootBug.x=-3.2,this.lootBug.z=1.2,this.lootBug.maxHp=5,this.lootBug.hp=5,this.lootBug.hitFlash=1,this.lootBugGroup.position.set(this.lootBug.x,0,this.lootBug.z),this.lootBugGroup.visible=!0,this.spawnSkyPillar(this.lootBug.x,this.lootBug.z,16436245,2,.48)),N||t.tier>=2){this.spawnUnit("blue","charged",l,f(c+1.5),0,-8.5,void 0,!0);const H=N?4:2;for(let z=0;z<H;z++){const L=u(l+(z-(H-1)*.5)*1.8);this.spawnUnit("blue","charged",L,f(c+1.8),0,-8.8)}}this.spawnFloatingPopup(l,3,c,`💰 黄金陨石盗宝雨[${t.badge}] +${U}⚡ & 盗宝虫!`,"#facc15"),v=`💰 【${t.badge}·黄金陨石盗宝雨】+${U}⚡`,T="黄金盗宝虫现身桥面 · 击杀小怪爆出高倍赏金！"}const x=[{delay:.25,zCenter:7.5,flash:p.flash,hex1:p.c1,hex2:p.c2},{delay:.5,zCenter:1.5,flash:"#facc15",hex1:16436245,hex2:p.c1},{delay:.76,zCenter:-4.5,flash:p.flash,hex1:p.c1,hex2:p.c2},{delay:1.04,zCenter:-10.5,flash:"#ff2a55",hex1:p.c2,hex2:16436245},{delay:1.35,zCenter:Mt+1.2,flash:"#facc15",hex1:16436245,hex2:p.c1,isFinale:!0}].slice(0,t.orbitalFollowupWaves);for(const _ of x)this.skillWaveQueue.push({delay:_.delay,exec:()=>{const N=this.findDensestRedCluster(t.orbitalXHalfSpan,6),U=t.isCompleteForm?0:N.count>0?N.x:l,H=t.isCompleteForm||_.isFinale?_.zCenter:N.count>0?N.z:_.zCenter;xt.playExplosion(),this.addCameraShake(_.isFinale?1.45:.65+t.tier*.15),t.tier>=2&&this.triggerScreenFlash(_.flash,_.isFinale?.92:.58);const z=[-6.4,-2.8,0,2.8,6.4],L=t.tier===1?[-2.2,2.2]:t.tier===2?[-3.8,0,3.8]:z;for(let A=0;A<L.length;A++){const E=u((t.isCompleteForm?0:U)+L[A]+(Math.random()-.5)*.6),I=f(H+(Math.random()-.5)*1.2),V=A%2===0?_.hex1:_.hex2,$=_.isFinale&&A===2?4.6:1.6+t.tier*.35;this.spawnSkyPillar(E,I,V,$,_.isFinale?.75:.5),this.spawnShockwave(E,I,V,_.isFinale?9.5:3.8+t.tier*.7,.48),this.spawnBurstParticles(E,1.3,I,V,_.isFinale?55:16+t.tier*4)}if(this.spawnShockwave(U,H,_.hex1,_.isFinale?18:8.5+t.tier*1.8,.6),w(t.isCompleteForm?null:U,H,t.orbitalXHalfSpan,6,.035),_.isFinale&&t.isCompleteForm&&this.bossHp>0&&!this.isStageEnded){const A=1+this.state.getSkillNodeRank("orbital_t1")*.12,E=Math.round(this.bossMaxHp*.06*A);this.bossHp=Math.max(1,this.bossHp-E),this.bossHitFlash=1,this.spawnFloatingPopup(0,3.4,Mt+1,`☄️ 终焉主炮直击母巢 -${E}!`,"#facc15")}}});return(M=this.onBanner)==null||M.call(this,v,T),!0}spawnBurstParticles(t,e,n,s,a){const o=this.lowSpecMode||this.isMobileDevice?Math.max(1,Math.ceil(a*.48)):a;let r=0;for(let l=0;l<pa&&r<o;l++){const c=this.particles[l];c.active||(c.active=!0,c.x=t+(Math.random()-.5)*.65,c.y=e+Math.random()*.5,c.z=n+(Math.random()-.5)*.65,c.vx=(Math.random()-.5)*11.5,c.vy=4.2+Math.random()*8.8,c.vz=(Math.random()-.5)*11.5,c.life=0,c.maxLife=.42+Math.random()*.36,c.scale=.25+Math.random()*.32,c.color.setHex(s),r++)}}spawnFloatingPopup(t,e,n,s,a){const o=this.projectToScreen(t,e,n);if(!o.visible)return;const r=document.createElement("div");r.className="float-popup",r.style.left=`${o.x}px`,r.style.top=`${o.y}px`,r.style.color=a,r.innerHTML=Do(s),this.labelsContainer.appendChild(r),setTimeout(()=>r.remove(),750)}update(t){var f,m,p,S,g,h,b,w,y,C;const e=Math.min(t,.05);if(!this.isPaused&&!this.isStageEnded&&t>0&&t<.25&&(this.avgFrameMs=this.avgFrameMs*.9+t*1e3*.1,t>.0235?this.slowFrameStreak=Math.min(60,this.slowFrameStreak+1):this.slowFrameStreak=Math.max(0,this.slowFrameStreak-1),this.usePostProcessing&&(this.avgFrameMs>21.5||this.slowFrameStreak>=16)&&(this.usePostProcessing=!1),!this.lowSpecMode&&(this.avgFrameMs>24.5||this.slowFrameStreak>=28)&&(this.lowSpecMode=!0,this.renderer.setPixelRatio(1),this.renderer.setSize(window.innerWidth,window.innerHeight))),this.elapsedTime+=e,this.cameraShake=Math.max(0,this.cameraShake-e*2.5),this.quakeTimer>0){this.quakeTimer=Math.max(0,this.quakeTimer-e);const v=this.quakeTimer/Math.max(.1,this.quakeMaxTimer);this.cameraShake=Math.max(this.cameraShake,this.quakeIntensity*(.55+.45*v)),this.quakeTimer<=0&&(this.quakeMaxTimer=0,this.quakeIntensity=0,document.body.classList.remove("screen-quake-active"))}if(this.adrenalineTimer>0&&(this.adrenalineTimer=Math.max(0,this.adrenalineTimer-e)),this.killStreakWindowTimer>0&&(this.killStreakWindowTimer=Math.max(0,this.killStreakWindowTimer-e),this.killStreakWindowTimer<=0&&(this.killStreakCount=0,this.nextStreakMilestone=25)),!this.isPaused&&this.skillWaveQueue.length>0)for(let v=this.skillWaveQueue.length-1;v>=0;v--){const T=this.skillWaveQueue[v];T.delay-=e,T.delay<=0&&(this.skillWaveQueue.splice(v,1),T.exec())}if(this.isStageEnded||this.isPaused){if(this.isStageEnded&&!this.isPaused&&this.lastStageVictory){if(this.victoryClimaxTimer>0){this.victoryClimaxTimer=Math.max(0,this.victoryClimaxTimer-e);const v=1-this.victoryClimaxTimer/1.25,T=(f=this.currentLevel)!=null&&f.isMegaBoss?Mt-2.2:Mt-3.2;this.bossGroup.position.set((Math.random()-.5)*.65,-5.8*v,T-v*1.5),this.bossGroup.rotation.x=-.58*v,this.bossGroup.rotation.z=Math.sin(v*18)*.16;for(let P=0;P<Qe;P++){const x=this.units[P];x.active&&x.team==="blue"&&(x.spawnHop=Math.abs(Math.sin(this.elapsedTime*14+x.id))*1.35)}this.victoryClimaxTimer<=0&&((m=this.onStageEnd)==null||m.call(this,!0))}else if(this.victoryFireworkTimer-=e,this.victoryFireworkTimer<=0){this.victoryFireworkTimer=.65;const v=[16436245,61695,14239471,2278750],T=v[Math.floor(Math.random()*v.length)],P=(Math.random()-.5)*14,x=(Math.random()-.5)*18;this.spawnSkyPillar(P,x,T,2,.5),this.spawnShockwave(P,x,T,5.5,.48),this.spawnBurstParticles(P,2.2,x,T,45)}}else this.bossHead.position.y=2.75+Math.sin(this.elapsedTime*2.6)*.14;this.bossPortalRing.rotation.z=this.elapsedTime*1.4,(p=this.bossPortalMat)!=null&&p.uniforms&&(this.bossPortalMat.uniforms.uTime.value=this.elapsedTime),this.starfieldPoints&&(this.starfieldPoints.rotation.y=this.elapsedTime*.018),this.radarDish&&(this.radarDish.rotation.y=this.elapsedTime*1.6),this.abyssMat.map&&(this.abyssMat.map.offset.y=this.elapsedTime*.06%1),this.updateEnvironmentSpectacle(e),this.updateParticles(e),this.renderScene();return}this.isOverrunFrenzy||(this.stageCombatTime+=e);const s=16*(this.keysDown.has("ShiftLeft")||this.keysDown.has("ShiftRight")?1.75:1);if((this.keysDown.has("KeyA")||this.keysDown.has("ArrowLeft"))&&(this.turretTargetX=Math.max(-ue+1.2,this.turretTargetX-s*e)),(this.keysDown.has("KeyD")||this.keysDown.has("ArrowRight"))&&(this.turretTargetX=Math.min(ue-1.2,this.turretTargetX+s*e)),this.turretX=jt.lerp(this.turretX,this.turretTargetX,Math.min(1,e*22)),this.turretGroup.position.x=this.turretX,this.turretRecoil=Math.max(0,this.turretRecoil-e*8),this.turretBarrel.position.z=-.62+this.turretRecoil*.36,this.turretMuzzleLight.intensity=this.turretRecoil*6.5,this.turretGaugeNeedle&&(this.turretGaugeNeedle.rotation.z=-.45+this.turretRecoil*1.15+Math.sin(this.elapsedTime*16)*.08),this.mascotGroup){this.mascotCheerBoost=Math.max(0,this.mascotCheerBoost-e*2.2);const v=this.turretX<-7.2?1.82:-1.82;this.mascotGroup.position.x=jt.lerp(this.mascotGroup.position.x,v,Math.min(1,e*11));const T=this.state.championCharge>=100?11.5:7.5;this.mascotGroup.position.y=.02+Math.abs(Math.sin(this.elapsedTime*T))*.08+Math.sin(Math.min(1,this.mascotCheerBoost)*Math.PI)*.34,this.mascotGroup.rotation.y=0}this.mascotLeftArm&&(this.mascotLeftArm.rotation.z=Math.sin(this.elapsedTime*7.5)*.05+this.mascotCheerBoost*.12),this.turretEvoHalo&&this.currentTurretEvoTier>=2&&(this.turretEvoHalo.rotation.z=this.elapsedTime*3.8);const a=this.isHoldingFireInput(),o=this.isSteeringInput();if(a){this.wasHoldingFire=!0;const v=this.state.getSkillChargeMultiplier();if(this.state.championCharge<100&&(this.state.championCharge=Math.min(100,this.state.championCharge+e*8.6*v)),this.holdChargeParticleTimer+=e,this.holdChargeParticleTimer>=.14){this.holdChargeParticleTimer=0;const T=this.state.championCharge>=100?16436245:61695;this.spawnBurstParticles(this.turretX+(Math.random()-.5)*.9,.65,wt-.5,T,this.state.championCharge>=100?3:1)}this.state.championCharge>=100&&!this.heroChargeFullNotified&&(this.heroChargeFullNotified=!0,this.spawnShockwave(this.turretX,wt,16436245,2.8,.35),this.spawnBurstParticles(this.turretX,1.1,wt-.5,16436245,18),this.spawnFloatingPopup(this.turretX,2.35,wt-1,"👑 能量已满 · 松手召唤英雄!","#facc15"))}else if(o&&this.state.championCharge<100){const v=this.state.getSkillChargeMultiplier();this.state.championCharge=Math.min(100,this.state.championCharge+e*3.4*v)}this.state.championCharge<100&&(this.heroChargeFullNotified=!1),this.turretGroundRingMat&&(this.state.championCharge>=100?(this.turretGroundRingMat.color.setHex(16436245),this.turretGroundRingMat.opacity=.65+.3*Math.sin(this.elapsedTime*10)):a?(this.turretGroundRingMat.color.setHex(61695),this.turretGroundRingMat.opacity=.72):(this.turretGroundRingMat.color.setHex(61695),this.turretGroundRingMat.opacity=.42)),this.skillOverdriveTimer>0&&(this.skillOverdriveTimer=Math.max(0,this.skillOverdriveTimer-e));const r=a?1.08:1,l=(this.adrenalineTimer>0?1.22:1)*(this.skillOverdriveTimer>0?1.25:1)*r,c=this.state.getFireRatePerSec()*l*(this.isOverrunFrenzy?3:1);this.shootTimer+=e;const d=1/c;if(this.shootTimer>=d&&(this.shootTimer%=d,this.fireTurret()),this.isOverrunFrenzy){if(this.overrunTimer-=e,this.overrunTimer<=0){this.finishStage(!0);return}}else{const v=Math.max(1,((S=this.currentLevel)==null?void 0:S.id)||1),T=this.bossBerserkTriggered?1.2:1;if(this.enemySpawnTimer+=e*T,this.enemySpawnTimer>=this.currentLevel.enemySpawnInterval){this.enemySpawnTimer=0;const x=this.currentLevel.enemyBurstCount,M=[-4.8,0,4.8];for(let _=0;_<x;_++){const U=M[_%3]+(Math.random()-.5)*2.8,H=Mt+.8+Math.random()*1.4,z=this.bossBerserkTriggered?.18:Math.min(.16,.06+(v-1)*.01),L=Math.random()<z?"baneling":"normal";this.spawnUnit("red",L,U,H,(Math.random()-.5)*.6,3.3)}}if(v>=2&&(this.shamanSpawnTimer+=e*T,this.shamanSpawnTimer>=12)){this.shamanSpawnTimer=0;const x=(Math.random()-.5)*9.5;this.spawnUnit("red","shaman",x,Mt+1.1,0,2.9)}if(this.currentLevel.bruteSpawnInterval>0&&(this.bruteSpawnTimer+=e*T,this.bruteSpawnTimer>=this.currentLevel.bruteSpawnInterval)){this.bruteSpawnTimer=0;const x=(Math.random()-.5)*9.5;this.spawnUnit("red","brute",x,Mt+1.2,0,3)}const P=this.state.getSkillNodeRank("tycoon_t2");if(this.lootBug.active){const x=P>0?1.12:1.65;this.lootBug.x+=this.lootBug.dirX*x*e;const M=Math.abs(Math.sin(this.elapsedTime*12))*.25;if(this.lootBugGroup.position.set(this.lootBug.x,M,this.lootBug.z+Math.sin(this.elapsedTime*3.5)*.35),this.lootBugGroup.rotation.y=(this.lootBug.dirX>0?Math.PI/2:-Math.PI/2)+Math.sin(this.elapsedTime*14)*.18,this.lootBug.hitFlash>0){this.lootBug.hitFlash=Math.max(0,this.lootBug.hitFlash-e*6);const _=1+this.lootBug.hitFlash*.25;this.lootBugGroup.scale.set(_,_,_)}else this.lootBugGroup.scale.set(1,1,1);Math.random()<.35&&this.spawnBurstParticles(this.lootBug.x,.6,this.lootBug.z,16436245,1),Math.abs(this.lootBug.x)>10.5&&(this.lootBug.active=!1,this.lootBug.spawnTimer=P>0?10.5:16.5,this.lootBugGroup.visible=!1,this.lootBugLabelEl&&(this.lootBugLabelEl.style.display="none"),this.spawnFloatingPopup(this.lootBug.x,1.8,this.lootBug.z,"💨 盗宝虫溜走了!","#94a3b8"))}else if(this.lootBug.spawnTimer-=e,this.lootBug.spawnTimer<=0){const x=Math.random()<.5?1:-1;this.lootBug.active=!0,this.lootBug.dirX=x,this.lootBug.x=-x*10,this.lootBug.z=.8+(Math.random()-.5)*4.2,this.lootBug.maxHp=Math.min(14,6+Math.floor(v/2)),this.lootBug.hp=this.lootBug.maxHp,this.lootBug.hitFlash=0,this.lootBugGroup.position.set(this.lootBug.x,0,this.lootBug.z),this.lootBugGroup.visible=!0,this.spawnSkyPillar(this.lootBug.x,this.lootBug.z,16436245,1.8,.45),this.spawnShockwave(this.lootBug.x,this.lootBug.z,16436245,3.6,.4),this.spawnFloatingPopup(this.lootBug.x,2,this.lootBug.z,"💰 黄金盗宝虫出没！快拦截！","#facc15")}}for(const v of this.gates)if(v.addCooldown>0&&(v.addCooldown=Math.max(0,v.addCooldown-e)),v.cfg.moveRangeX&&v.cfg.moveSpeed&&(v.currentX=v.cfg.x+Math.sin(this.elapsedTime*v.cfg.moveSpeed+(v.cfg.movePhase||0))*v.cfg.moveRangeX,v.group.position.x=v.currentX),v.group.rotation.x=Math.sin(this.elapsedTime*2.8+v.cfg.z)*.032,v.pulseTimer>0){v.pulseTimer=Math.max(0,v.pulseTimer-e*5.2);const T=1+v.pulseTimer*.24;v.group.scale.set(T,T,1)}else v.group.scale.set(1,1,1);this.jumpPadSoundCooldown=Math.max(0,this.jumpPadSoundCooldown-e);for(const v of this.wallRuntimes)if(v.cfg.moveRangeX&&v.cfg.moveSpeed){const T=Math.sin(this.elapsedTime*v.cfg.moveSpeed+(v.cfg.movePhase||0))*v.cfg.moveRangeX;v.group.position.x=T,v.cfg.x1=v.baseX1+T,v.cfg.x2=v.baseX2+T}for(const v of this.gears)if(v.alive){v.cfg.moveRangeX&&v.cfg.moveSpeed&&(v.cfg.x=v.baseX+Math.sin(this.elapsedTime*v.cfg.moveSpeed+(v.cfg.movePhase||0))*v.cfg.moveRangeX,v.mesh.position.x=v.cfg.x);const T=1+Math.sin(this.elapsedTime*15+v.baseX)*.025;if(v.hitFlash>0){v.hitFlash=Math.max(0,v.hitFlash-e*7);const P=1+v.hitFlash*.22;v.mesh.scale.set(P*T,P/T,P*T)}else v.mesh.scale.set(T,1/T,T);Math.random()<e*6.5&&this.spawnBurstParticles(v.cfg.x,2.02,v.cfg.z,16777215,1)}for(const v of this.zones){if(v.beltTex&&(v.beltTex.offset.y=-(this.elapsedTime*1.9%1)),v.ringMesh){const T=1+Math.sin(this.elapsedTime*6.5)*.12;v.ringMesh.scale.set(T,T,1)}if(v.holoCross&&(v.holoCross.rotation.y=this.elapsedTime*2.4,v.holoCross.position.y=.78+Math.sin(this.elapsedTime*4.2)*.14),v.cfg.type==="toxic_mire"&&Math.random()<e*2.2){const T=v.cfg.x+(Math.random()-.5)*v.cfg.width*.65,P=v.cfg.z+(Math.random()-.5)*v.cfg.length*.65;this.spawnBurstParticles(T,.12,P,6046255,1)}else if(v.cfg.type==="heal_sanctuary"&&Math.random()<e*4.5){const T=v.cfg.x+(Math.random()-.5)*v.cfg.width*.8,P=v.cfg.z+(Math.random()-.5)*v.cfg.length*.8;this.spawnBurstParticles(T,.35,P,16020150,1)}}for(const v of this.bumpers)if(v.pulseTimer>0){v.pulseTimer=Math.max(0,v.pulseTimer-e*5.5);const T=1+v.pulseTimer*.32;v.group.scale.set(T,1+v.pulseTimer*.15,T),v.ringMat.color.setHex(v.pulseTimer>.35?16436245:16346752)}else v.group.scale.set(1,1,1);for(const v of this.barrels)if(v.alive){const T=1+Math.sin(this.elapsedTime*8.5)*.07;v.mesh.scale.set(T,T,T)}for(const v of this.nests)if(v.alive)if(v.monsterMesh.position.y=1.88+Math.sin(this.elapsedTime*4.5)*.14,v.monsterMesh.rotation.y=Math.sin(this.elapsedTime*2.2)*.35,v.hitFlash>0){v.hitFlash=Math.max(0,v.hitFlash-e*6);const T=1+v.hitFlash*.18;v.monsterMesh.scale.set(T,T,T)}else v.monsterMesh.scale.set(1,1,1);if(this.bossHead.position.y=2.75+Math.sin(this.elapsedTime*2.6)*.14,this.bossHead.rotation.z=Math.sin(this.elapsedTime*1.5)*.04,this.bossPortalRing.rotation.z=this.elapsedTime*1.4,(g=this.bossPortalMat)!=null&&g.uniforms&&(this.bossPortalMat.uniforms.uTime.value=this.elapsedTime),this.starfieldPoints&&(this.starfieldPoints.rotation.y=this.elapsedTime*.022),this.radarDish&&(this.radarDish.rotation.y=this.elapsedTime*1.6),this.abyssMat.map&&(this.abyssMat.map.offset.y=this.elapsedTime*.06%1),this.updateEnvironmentSpectacle(e),this.ambientWeatherTimer+=e,this.ambientWeatherTimer>=.14){this.ambientWeatherTimer=0;const v=(Math.random()-.5)*28,T=(Math.random()-.5)*38,P=this.currentTheme.id==="glacier"?6.5:.4;this.spawnBurstParticles(v,P,T,this.currentTheme.ambientParticleColor,1)}this.megaBossHalo&&((h=this.currentLevel)!=null&&h.isMegaBoss)&&(this.megaBossHalo.rotation.z=-this.elapsedTime*2.8);const u=(b=this.currentLevel)!=null&&b.isMegaBoss?1.62:(w=this.currentLevel)!=null&&w.isMiniBoss?1.28:1;if(this.bossHitFlash>0){this.bossHitFlash=Math.max(0,this.bossHitFlash-e*7);const v=u*(1+this.bossHitFlash*.12);this.bossGroup.scale.set(v,v,v)}else this.bossGroup.scale.set(u,u,u);((y=this.currentLevel)!=null&&y.isMegaBoss||(C=this.currentLevel)!=null&&C.isMiniBoss)&&!this.isOverrunFrenzy&&this.updateMegaBossMechanics(e),this.isOverrunFrenzy||this.updateSkillTreeMechanics(e),this.simulateUnits(e),this.updateParticles(e),this.syncWorldLabels(),this.renderScene()}updateEnvironmentSpectacle(t){var n,s,a;const e=this.elapsedTime;(n=this.abyssShaderMat)!=null&&n.uniforms&&(this.abyssShaderMat.uniforms.uTime.value=e),(s=this.waterfallShaderMat)!=null&&s.uniforms&&(this.waterfallShaderMat.uniforms.uTime.value=e),(a=this.bastionShieldMat)!=null&&a.uniforms&&(this.bastionShieldMat.uniforms.uTime.value=e),this.planetGroup&&(this.planetGroup.rotation.y=e*.045,this.planetGroup.position.y=22.5+Math.sin(e*.6)*.45),this.holoGlobeGroup&&(this.holoGlobeGroup.rotation.y=-e*1.4,this.holoGlobeGroup.position.y=2.95+Math.sin(e*3.2)*.12);for(let o=0;o<this.bastionTurretPods.length;o++){const r=this.bastionTurretPods[o];r.rotation.y=Math.sin(e*1.8+o*2.1)*.48}for(let o=0;o<this.themeSpinners.length;o++)this.themeSpinners[o].rotation.z=e*(o%2===0?.85:-.85)+o*.7;for(let o=0;o<this.floatingMonoliths.length;o++){const r=this.floatingMonoliths[o];r.group.position.y=r.baseY+Math.sin(e*1.65+r.phase)*.58,r.group.rotation.y=e*.28+r.phase,r.ringOuter.rotation.z=e*1.45,r.ringInner.rotation.x=-e*1.95}for(let o=0;o<this.skyCruisers.length;o++){const r=this.skyCruisers[o],l=(e*r.speed+r.phase*8)%44-22;r.group.position.z=r.baseZ+l*r.dirZ*.65,r.group.position.y=r.baseY+Math.sin(e*1.3+r.phase)*.45,r.group.rotation.z=Math.sin(e*.9+r.phase)*.08}if(this.distantLaserTimer-=t,this.distantLaserTimer<=0&&this.skyCruisers.length>=2){this.distantLaserTimer=this.isMobileDevice?2.4:1.15;const o=this.skyCruisers[Math.floor(Math.random()*this.skyCruisers.length)],r=o.group.position.x+(Math.random()-.5)*2.2,l=o.group.position.z+(Math.random()-.5)*3;this.spawnBurstParticles(r,o.group.position.y,l,16775920,this.isMobileDevice?2:4)}}updateSkillTreeMechanics(t){const e=this.state.getPowerMultiplier();if(this.scorchedEarthTimer>0&&(this.scorchedEarthTimer=Math.max(0,this.scorchedEarthTimer-t),this.scorchedEarthTickTimer-=t,this.scorchedEarthTickTimer<=0)){this.scorchedEarthTickTimer=.42;const l=(Math.random()-.5)*20,c=(Math.random()-.5)*12;this.spawnSkyPillar(c,l,14239471,1.9,.38),this.spawnShockwave(c,l,16347926,4.8,.35),this.spawnBurstParticles(c,.8,l,16347926,18);for(const d of this.activeRedIndices){const u=this.units[d];if(u.active)if(u.kind==="brute"||u.kind==="shaman"){const f=Math.max(15,u.maxHp*.2);u.hp>f&&(u.hp=Math.max(f,u.hp-u.maxHp*.035)),this.spawnBurstParticles(u.x,.9,u.z,14239471,3)}else u.z>Mt+2.2&&(u.active=!1,this.onUnitKilled(u))}}if(this.state.getSkillNodeRank("swarm_t4")>0&&(this.swarmBroodTimer-=t,this.swarmBroodTimer<=0)){this.swarmBroodTimer=6.5,this.spawnShockwave(0,wt-2.2,3718648,4.2,.35);for(const l of[-3.6,-1.2,1.2,3.6]){const c=this.spawnUnit("blue","charged",l,wt-2,(Math.random()-.5)*1.2,-9.2);c&&(c.spawnHop=1.25)}this.spawnFloatingPopup(0,2.2,wt-2.4,"🌊 母巢自动孵化 +4自爆虫兵!","#38bdf8")}const n=this.state.getSkillNodeRank("gate_t3");if(n>0&&this.gates.length>0&&(this.gatePulseTimer-=t,this.gatePulseTimer<=0)){this.gatePulseTimer=4.2;const l=this.state.getSkillNodeRank("gate_t4")>0,c=(16+n*12)*e;for(const d of this.gates)if(!(d.cfg.op!=="add"&&d.cfg.op!=="mul")){d.pulseTimer=.85,this.spawnShockwave(d.currentX,d.cfg.z,2282478,3.6,.32),this.spawnBurstParticles(d.currentX,1.1,d.cfg.z,2282478,8);for(let u=0;u<n;u++){const f=d.currentX+(Math.random()-.5)*Math.min(d.cfg.width*.65,1.8);this.spawnUnit("blue",l?"charged":"normal",f,d.cfg.z-.35,(Math.random()-.5)*2.2,-8.5)}for(const u of this.activeRedIndices){const f=this.units[u];f.active&&(f.x-d.currentX)**2+(f.z-d.cfg.z)**2<=3.8*3.8&&(f.hp-=c,f.vz-=2.5,this.spawnBurstParticles(f.x,.9,f.z,2282478,5),f.hp<=0&&(f.active=!1,this.onUnitKilled(f)))}}}const s=this.state.getSkillNodeRank("plasma_t3");if(s>0&&this.activeRedIndices.length>0&&(this.plasmaThunderTimer-=t,this.plasmaThunderTimer<=0)){this.plasmaThunderTimer=Math.max(2.4,4.2-s*.5);let l=null;for(const c of this.activeRedIndices){const d=this.units[c];d.active&&(!l||d.hp>l.hp)&&(l=d)}if(l){const c=(36+s*18)*e;this.spawnSkyPillar(l.x,l.z,16436245,1.45,.32),this.spawnShockwave(l.x,l.z,61695,3.2,.28),this.spawnBurstParticles(l.x,1.1,l.z,16436245,18),l.hp-=c,l.empTimer=Math.max(l.empTimer||0,2),l.hp<=0&&(l.active=!1,this.onUnitKilled(l));for(const d of this.activeRedIndices){const u=this.units[d];!u.active||u===l||(u.x-l.x)**2+(u.z-l.z)**2<=2.8*2.8&&(u.hp-=c*.4,u.empTimer=Math.max(u.empTimer||0,1.4),u.hp<=0&&(u.active=!1,this.onUnitKilled(u)))}}}const a=this.state.getSkillNodeRank("orbital_t1");if(a>0&&this.activeRedIndices.length>0&&(this.orbitalStarfallTimer-=t,this.orbitalStarfallTimer<=0)){const l=this.state.getSkillNodeRank("orbital_t4")>0,c=this.state.getSkillNodeRank("orbital_t2");this.orbitalStarfallTimer=l?3.2:Math.max(3.4,5.6-a*.7);const d=this.findDensestRedCluster(3.6,3.6),u=[d];l&&u.push(this.findDensestRedCluster(3.6,3.6,{x:d.x,z:d.z,minDist:4.2}));for(const f of u){if(f.count<=0)continue;const m=f.x,p=f.z;this.spawnSkyPillar(m,p,14239471,1.65,.36),this.spawnShockwave(m,p,61695,3.8,.34),this.spawnBurstParticles(m,1,p,14239471,20);const S=(26+a*10)*e;for(const g of this.activeRedIndices){const h=this.units[g];h.active&&(h.x-m)**2+(h.z-p)**2<=3.6*3.6&&(h.hp-=S,c>0&&(h.empTimer=Math.max(h.empTimer||0,1.5+c*.6),h.x=jt.lerp(h.x,m,.32),h.z=jt.lerp(h.z,p,.32)),h.hp<=0&&(h.active=!1,this.onUnitKilled(h)))}}this.state.championCharge=Math.min(100,this.state.championCharge+3.5),this.state.orbitalCharge=Math.min(100,this.state.orbitalCharge+3.5)}const o=this.state.getSkillNodeRank("bastion_t1");if(o>0&&this.playerBaseHp>0&&this.playerBaseHp<this.playerBaseMaxHp&&(this.baseRegenTimer+=t,this.baseRegenTimer>=1)){this.baseRegenTimer-=1;const l=this.playerBaseMaxHp*(o*.006);this.playerBaseHp=Math.min(this.playerBaseMaxHp,this.playerBaseHp+l),this.lastKnownBaseHp=Math.max(this.lastKnownBaseHp,this.playerBaseHp)}const r=this.state.getSkillNodeRank("bastion_t2");if(r>0&&this.activeRedIndices.length>0&&(this.baseTurretTimer-=t,this.baseTurretTimer<=0)){this.baseTurretTimer=Math.max(.75,1.45-r*.2);const l=[];for(const d of this.activeRedIndices){const u=this.units[d];u.active&&u.z>-10.5&&l.push(u)}l.sort((d,u)=>u.z-d.z);const c=(22+r*14)*e;for(let d=0;d<Math.min(2,l.length);d++){const u=l[d],f=d===0?-5.8:5.8;this.spawnBurstParticles(f,1.3,wt-1.5,4906624,6),this.spawnSkyPillar(u.x,u.z,4906624,1.15,.25),this.spawnShockwave(u.x,u.z,4906624,2.3,.25),this.spawnBurstParticles(u.x,.9,u.z,4906624,12),u.hp-=c,u.vz-=2.8,u.hp<=0&&(u.active=!1,this.onUnitKilled(u))}}if(this.state.getSkillNodeRank("bastion_t4")>0&&(this.bastionPeriodicWaveTimer-=t,this.bastionPeriodicWaveTimer<=0&&this.activeRedIndices.length>0&&(this.bastionPeriodicWaveTimer=9.5,this.triggerBastionThornWave())),this.playerBaseHp<this.lastKnownBaseHp?(this.baseDamageAccum+=this.lastKnownBaseHp-this.playerBaseHp,this.lastKnownBaseHp=this.playerBaseHp,this.state.getSkillNodeRank("bastion_t4")>0&&this.bastionShockwavesTriggered<2&&this.baseDamageAccum>=this.playerBaseMaxHp*.2&&(this.baseDamageAccum=0,this.bastionShockwavesTriggered++,this.triggerBastionThornWave())):this.lastKnownBaseHp=this.playerBaseHp,this.state.getSkillNodeRank("tycoon_t4")>0&&this.state.stageGoldEarned>=this.tycoonGoldMilestone){this.tycoonGoldMilestone+=180,xt.playChampionSpawn(),this.addCameraShake(.42),this.spawnSkyPillar(0,4.5,16436245,2.4,.48),this.spawnShockwave(0,4.5,16436245,6.2,.45),this.spawnBurstParticles(0,1.5,4.5,16436245,45);for(const l of[-2.4,-.9,.9,2.4])this.spawnUnit("blue","charged",l,4.8,(Math.random()-.5)*.8,-8.5);this.spawnUnit("blue","charged",0,4.2,0,-8.2,void 0,!0),this.spawnFloatingPopup(0,2.6,4.5,"👑 黄金皇家雇佣军空降参战!","#facc15")}}triggerBastionThornWave(){var t;xt.playExplosion(),this.triggerContinuousQuake(.65,1.05),this.triggerScreenFlash("#4ade80",.65),this.spawnSkyPillar(0,wt-2.5,4906624,3.2,.52),this.spawnShockwave(0,wt-2.5,4906624,14.5,.58),this.spawnShockwave(0,2,61695,11.5,.48),this.spawnBurstParticles(0,1.4,wt-2.5,4906624,75);for(const e of this.activeRedIndices){const n=this.units[e];n.active&&(n.kind==="brute"||n.kind==="shaman"?(n.hp=Math.max(15,n.hp-n.maxHp*.16),n.z=Math.max(Mt+2,n.z-5.5),n.vz=-9.5,n.spawnHop=1.1):n.z>2?(n.active=!1,this.onUnitKilled(n)):(n.z=Math.max(Mt+1.5,n.z-4.5),n.vz=-8))}for(let e=0;e<4;e++){const n=-3.6+e*2.4;this.spawnUnit("blue","charged",n,wt-2.2,(Math.random()-.5)*1,-9.2)}this.spawnFloatingPopup(0,2.8,wt-3,"🛡️ 荆棘电磁反推! 4名禁卫军空降!","#4ade80"),(t=this.onBanner)==null||t.call(this,"🛡️ 堡垒基石【荆棘电磁反推】触发！","前排红军震退 · 4名黄金禁卫军紧急参战！")}syncBlueGateVisualStyle(t){const e=`+${t.cfg.value}`;t.labelEl.textContent=e,t.pillarMat.color.setHex(15248696),t.pillarMat.emissive.setHex(3875590),t.cfg.value>=6?(t.cfg.style="mega",t.shieldMat.map=this.getGateBannerTexture("mega",e),t.shieldMat.needsUpdate=!0,t.labelEl.className="gate-label mega-gate"):t.cfg.value>=5?(t.cfg.style="gold",t.shieldMat.map=this.getGateBannerTexture("gold",e),t.shieldMat.needsUpdate=!0,t.labelEl.className="gate-label gold-gate"):(t.cfg.style="blue",t.shieldMat.map=this.getGateBannerTexture("blue",e),t.shieldMat.needsUpdate=!0,t.labelEl.className="gate-label")}triggerThorSuperRailgun(){xt.playExplosion();const t=this.state.getSkillNodeRank("plasma_t4")>0;this.addCameraShake(t?.52:.35);const e=t?[jt.clamp(this.turretX-3.6,-8.5,8.5),this.turretX,jt.clamp(this.turretX+3.6,-8.5,8.5)]:[this.turretX];for(const a of e){this.spawnSkyPillar(a,wt-2.2,16436245,1.7,.38),this.spawnShockwave(a,wt-2.2,16436245,3.6,.34);for(const o of[12,6,0,-6,-12])this.spawnSkyPillar(a,o,61695,1.2,.28),this.spawnShockwave(a,o,16436245,2.6,.26),this.spawnBurstParticles(a,1,o,16436245,10)}const n=(t?54:42)*this.state.getPowerMultiplier();let s=0;for(const a of this.activeRedIndices){const o=this.units[a];o.active&&e.some(r=>Math.abs(o.x-r)<=2.1)&&(s++,o.hp-=n,o.empTimer=Math.max(o.empTimer||0,1.6),o.spawnHop=.8,o.hp<=0&&(o.active=!1,this.onUnitKilled(o)))}for(const a of this.gates)e.some(o=>Math.abs(a.currentX-o)<=a.cfg.width*.6)&&(a.chargeHits+=4,a.pulseTimer=.9,this.spawnBurstParticles(a.currentX,1.2,a.cfg.z,16436245,10));this.spawnFloatingPopup(this.turretX,2.2,wt-3.2,`⚡ ${t?"3道雷神超导主炮":"雷神超导贯穿炮"} (-${s})!`,"#facc15")}computeGiantTierStats(t,e=!1){const n=this.state.getPowerMultiplier(),s=this.state.getGiantTrooperSpec(),a=Math.min(4,Math.max(1,t)),o=s.fusionStatAmplify,r=a===1?1:a===2?1.72*o:a===3?2.55*o:3.55*o,l=a===1?1:a===2?1.56*o:a===3?2.22*o:3.05*o,c=e&&a===1?1.22:1;return{maxHp:16*n*s.baseHpMult*r*c,dmg:12*n*s.baseDmgMult*l*c,radius:Math.min(.72,.39+a*.075)}}promoteGiantUnit(t,e,n=0,s=0,a=0,o=!0){const r=Math.min(4,Math.max(2,e)),l=t.maxHp>0?t.hp/t.maxHp:1,c=n>0?a/n:l,d=Math.min(1,(l+c)*.58),u=this.computeGiantTierStats(r,!0);t.fusionTier=r,t.isMiniGiant=!0,t.kind="charged",t.fusionCooldown=1.35,t.spawnHop=1.28,t.radius=u.radius,t.maxHp=u.maxHp,t.hp=Math.max(1,u.maxHp*d),t.dmg=u.dmg;const f=r>=4?16436245:r===3?16347926:16498468;if(this.spawnShockwave(t.x,t.z,f,1.5+r*.45,.3),this.spawnBurstParticles(t.x,1,t.z,f,7+r*3),r>=3&&this.spawnSkyPillar(t.x,t.z,f,1.05,.26),o){const m=r>=4?"👑 四阶灭世神兵!":r===3?"🔥 合体! 三阶远古巨神!":"🗿 合体! 二阶巨神!",p=r>=4?"#fde047":r===3?"#fb923c":"#fcd34d";this.spawnFloatingPopup(t.x,1.85+r*.22,t.z,m,p)}}fireTurret(){const t=this.state.getGiantTrooperSpec();this.turretRecoil=t.isGiantMode?1.68:1.35,xt.playShoot(t.isGiantMode?"plasma":this.state.weapon);const e=this.state.getSkillChargeMultiplier()*(t.isGiantMode?1.35:1),n=(this.isHoldingFireInput()?1.5:this.isSteeringInput()?.85:.52)*e;this.state.championCharge=Math.min(100,this.state.championCharge+n);const s=t.isGiantMode?16347926:this.currentTurretEvoTier===2||this.state.weapon==="plasma"?16436245:61695;this.spawnBurstParticles(this.turretX,.9,wt-1.5,s,t.isGiantMode?12:this.currentTurretEvoTier>=1?8:5),t.isGiantMode?(this.spawnShockwave(this.turretX,wt-1.5,16347926,2.2,.25),this.addCameraShake(.06)):this.currentTurretEvoTier===2&&Math.random()<.35&&this.spawnShockwave(this.turretX,wt-1.5,16436245,1.8,.22);const a=this.state.getChargedCritChance(),o=this.state.getMiniGiantChance(),r=()=>this.skillOverdriveTimer>0||Math.random()<a?"charged":"normal",l=()=>o>0&&Math.random()<o,c=Math.max(this.skillOverdriveTimer>0?1:0,this.state.getExtraCloneChance()),d=Math.floor(c),f=1+(d+(Math.random()<c-d?1:0));if(f>=2)for(let p=0;p<f;p++){const g=(p-(f-1)*.5)*.88,h=l();this.spawnUnit("blue",h?"charged":r(),this.turretX+g,wt-1.4,g*.45,-9.25,void 0,h)}else{const p=l();this.spawnUnit("blue",p?"charged":r(),this.turretX+(Math.random()-.5)*.22,wt-1.4,0,-9.2,void 0,p)}const m=this.state.getSkillNodeRank("bastion_t3");if(m>0){this.praetorianShotCounter++;const p=Math.max(7,13-m*2);if(this.praetorianShotCounter>=p){this.praetorianShotCounter=0;const S=jt.clamp(this.turretX+(Math.random()<.5?-.95:.95),-ue+1.2,ue-1.2),g=this.spawnUnit("blue","charged",S,wt-1.5,0,-9,void 0,!0);g&&(g.maxHp*=1.35+m*.2,g.hp=g.maxHp,g.dmg*=1.2+m*.12,g.spawnHop=1.1,this.spawnShockwave(S,wt-1.5,4906624,2.2,.28),this.spawnBurstParticles(S,.9,wt-1.5,4906624,12),this.spawnFloatingPopup(S,1.9,wt-1.5,"🛡️ 禁卫重装出击!","#4ade80"))}}this.state.getSkillNodeRank("plasma_t4")>0&&(this.shotsFiredCounter++,this.shotsFiredCounter>=15&&(this.shotsFiredCounter=0,this.triggerThorSuperRailgun()))}isSegmentBlockedByWall(t,e,n,s){const a=this.walls.length;if(a===0)return!1;const o=e<s?e:s,r=e>s?e:s;for(let l=0;l<a;l++){const c=this.walls[l],d=c.z1<c.z2?c.z1:c.z2;if(!((c.z1>c.z2?c.z1:c.z2)<o||d>r)&&this.segmentsIntersect(t,e,n,s,c.x1,c.z1,c.x2,c.z2))return!0}return!1}segmentsIntersect(t,e,n,s,a,o,r,l){const c=(d,u,f,m,p,S)=>(S-u)*(f-d)>(m-u)*(p-d);return c(t,e,a,o,r,l)!==c(n,s,a,o,r,l)&&c(t,e,n,s,a,o)!==c(t,e,n,s,r,l)}findTargetEnemy(t,e,n=14.5){const s=this.targetSearchResult,a=e.length;if(a===0)return s.target=null,s.blocked=!1,s.dist=1/0,s;const o=this.lowSpecMode||this.isMobileDevice?12:20,r=Math.max(1,Math.floor(a/o)),l=t.id%r,c=n*n;let d=null,u=1/0,f=null,m=1/0;for(let p=l;p<a;p+=r){const S=this.units[e[p]];if(!S.active)continue;const g=S.z-t.z;if(Math.abs(g)>n)continue;const h=S.x-t.x,b=h*h+g*g;b>c||(b<m&&(m=b,f=S),b<u&&!this.isSegmentBlockedByWall(t.x,t.z,S.x,S.z)&&(u=b,d=S))}return d?(s.target=d,s.blocked=!1,s.dist=Math.sqrt(u),s):(s.target=f,s.blocked=!0,s.dist=Math.sqrt(m),s)}isNearAegisTitan(t,e){for(let n=0;n<this.activeAegisIndices.length;n++){const s=this.units[this.activeAegisIndices[n]];if(!s.active)continue;const a=s.x-t,o=s.z-e;if(a*a+o*o<=3.8*3.8)return!0}return!1}detonateBaneling(t){t.active=!1,xt.playBanelingPop(),this.addCameraShake(.32),this.spawnSkyPillar(t.x,t.z,8702998,1.35,.34),this.spawnShockwave(t.x,t.z,8702998,2.8,.38),this.spawnShockwave(t.x,t.z,16436245,1.6,.26),this.spawnBurstParticles(t.x,.7,t.z,10741301,36),this.spawnBurstParticles(t.x,.9,t.z,16436245,12);const e=1.45*1.45;for(let n=0;n<this.activeBlueIndices.length;n++){const s=this.units[this.activeBlueIndices[n]];if(!s.active)continue;const a=s.x-t.x,o=s.z-t.z;if(a*a+o*o<=e){let l=t.dmg;s.kind==="champion"&&(l*=.35),this.state.getSkillNodeRank("bastion_t3")>0&&(l*=.35),this.isNearAegisTitan(s.x,s.z)&&(l*=.5),s.hp-=l,s.hp<=0&&(s.active=!1,this.onUnitKilled(s))}}}triggerHammerSlam(t,e=!1,n){const s=this.state.getUltimateEvolutionSpec(),a=this.state.getSkillNodeRank("titan_t3"),o=4.6*s.radiusMult*(1+a*.12),r=o*o;let l=n?n.x:t.x,c=n?n.z:t.z-.8;if(!n&&e&&this.activeRedIndices.length>0){let h=0;for(let b=0;b<this.activeRedIndices.length;b++){const w=this.units[this.activeRedIndices[b]];w.active&&(w.x-l)**2+(w.z-c)**2<=r&&h++}if(h===0){const b=this.findDensestRedCluster(o,o);b.count>0&&(l=b.x,c=b.z,t.vx=jt.lerp(t.vx,(b.x-t.x)*2.2,.5))}}const d=this.state.getCommittedSkillBranch(),u=d==null?void 0:d.id,m=u&&{swarm:{c1:3718648,c2:3003583},titan:{c1:16347926,c2:16436245},gate:{c1:2282478,c2:14239471},plasma:{c1:16436245,c2:61695},orbital:{c1:14239471,c2:61695},bastion:{c1:4906624,c2:16436245},tycoon:{c1:16436245,c2:16096779}}[u]||{c1:61695,c2:16436245};xt.playExplosion(),this.addCameraShake((e?.48:.36)*s.radiusMult),(s.tier>=1||e)&&this.spawnSkyPillar(l,c,m.c1,(s.tier===0?1.15:2.2)*s.radiusMult,.34+s.tier*.04),this.spawnShockwave(l,c,m.c1,5.4*s.radiusMult,.38+s.tier*.04),s.tier>=1&&this.spawnShockwave(l,c,m.c2,3.6*s.radiusMult,.34),this.spawnBurstParticles(l,1,c,m.c1,Math.round(14+s.tier*11)),s.tier>=1&&this.spawnBurstParticles(l,1.2,c,m.c2,Math.round(8+s.tier*6));const p=u==="tycoon"?1+Math.min(.6,Math.floor(this.state.gold/400)*(this.state.getSkillNodeRank("tycoon_t3")*.04)):1;let S=!1,g=0;for(let h=0;h<this.activeRedIndices.length;h++){const b=this.units[this.activeRedIndices[h]];if(!b.active)continue;const w=b.x-l,y=b.z-c,C=w*w+y*y;if(C<=r){g++;const v=b.kind==="brute"||b.kind==="shaman";v&&(S=!0);const T=t.dmg*(v?1.65:.88)*(.78+s.tier*.14)*p;b.hp-=T;const P=Math.max(.2,Math.sqrt(C));b.x=jt.clamp(b.x+w/P*1.15,-ue+.8,ue-.8),b.z=Math.max(Mt+1,b.z-(v?1.35:2.1)),b.vz=-11.5,b.vx+=w/P*5.5,b.spawnHop=1.35,b.hp<=0&&(b.active=!1,this.onUnitKilled(b))}}if(u==="swarm"){const h=this.state.getSkillNodeRank("swarm_t1"),b=this.state.getSkillNodeRank("swarm_t4")>0,w=e?h+1+(b?2:0):Math.max(1,Math.ceil(h*.6));for(let y=0;y<w;y++){const C=y/w*Math.PI*2,v=t.x+Math.cos(C)*1.15,T=t.z-.5+Math.sin(C)*.85,P=this.spawnUnit("blue",b||Math.random()<this.state.getChargedCritChance()?"charged":"normal",v,T,Math.cos(C)*3.8,-8.6,t.passedGates);P&&(P.spawnHop=1.45)}e&&this.spawnFloatingPopup(t.x,2.2,t.z,`🌊 裂变母巢重锤 +${w}兵!`,"#38bdf8")}else if(u==="titan"){const h=this.state.getSkillNodeRank("titan_t3");if((s.tier>=2?[.18,.36]:s.tier>=1?[.2]:[]).forEach((w,y)=>{this.skillWaveQueue.push({delay:w,exec:()=>{if(!t.active||this.isStageEnded)return;const C=(5.8+y*1.6)*s.radiusMult,v=this.findDensestRedCluster(C*.8,C*.8),T=v.count>0?v.x:l,P=v.count>0?v.z:c-1.2-y*1.1;this.addCameraShake(.42),this.spawnShockwave(T,P,y===0?16347926:16436245,C,.45),this.spawnBurstParticles(T,1,P,16347926,24);const x=(C*.82)**2;for(const M of this.activeRedIndices){const _=this.units[M];_.active&&(_.x-T)**2+(_.z-P)**2<=x&&(_.hp-=t.dmg*.52,_.vz=-9.5,_.spawnHop=1.15,_.hp<=0&&(_.active=!1,this.onUnitKilled(_)))}}})}),e&&h>0){const w=this.state.getGiantTrooperSpec();let y=0;const C=1;for(const v of this.activeBlueIndices){if(y>=C)break;const T=this.units[v];if(!T.active||T.kind==="champion")continue;const P=T.fusionTier||1;P<w.maxFusionTier&&(T.x-t.x)**2+(T.z-t.z)**2<=5.8*5.8&&(this.promoteGiantUnit(T,P+1,T.maxHp*.5,T.dmg*.5,T.hp*.65,!0),y++)}}else S&&this.spawnFloatingPopup(l,2.2,c,"🗿 崩山聚变巨神锤: 破甲!","#f97316")}else if(u==="gate"){if(e){const h=this.state.getSkillNodeRank("gate_t1"),b=this.state.getSkillNodeRank("gate_t2"),w=this.state.getSkillNodeRank("gate_t3"),y=this.state.getMaxBlueGateCap();for(const C of this.gates)if(C.pulseTimer=1,this.spawnShockwave(C.currentX,C.cfg.z,2282478,3.2,.35),C.cfg.op==="sub"||C.cfg.op==="div")C.chargeHits+=6+h*3,C.chargeHits>=18&&(C.chargeHits=0,C.cfg.op==="div"||C.cfg.value<=1?this.flipHazardGateToBlue(C):(C.cfg.value-=1,C.labelEl.textContent=`-${C.cfg.value}`));else if(C.cfg.op==="add"){C.chargeHits+=8+b*5;const v=42+C.cfg.value*16;if(C.chargeHits>=v&&C.cfg.value<y&&(C.chargeHits=0,C.cfg.value+=1,this.syncBlueGateVisualStyle(C),this.spawnFloatingPopup(C.currentX,2,C.cfg.z,`⬆️ 矩阵共振充能锤 +${C.cfg.value}!`,"#22d3ee")),w>0)for(let T=0;T<w;T++)this.spawnUnit("blue","normal",C.currentX+(Math.random()-.5)*1.4,C.cfg.z-.3,(Math.random()-.5)*2.5,-8.2)}this.spawnFloatingPopup(l,2.2,c,"🚪 矩阵共振充能锤: 全门脉充能!","#22d3ee")}}else if(u==="plasma"){const h=this.state.getSkillNodeRank("plasma_t1"),b=this.state.getSkillNodeRank("plasma_t2"),w=this.state.getSkillNodeRank("plasma_t4")>0;let y=3+b*2;for(const v of this.activeRedIndices){if(y<=0)break;const T=this.units[v];T.active&&(T.x-l)**2+(T.z-c)**2<=10.5*10.5&&(y--,T.hp-=t.dmg*(.5+h*.14),T.empTimer=Math.max(T.empTimer||0,1.4),this.spawnSkyPillar(T.x,T.z,16436245,.95,.26),this.spawnBurstParticles(T.x,1,T.z,61695,10),T.hp<=0&&(T.active=!1,this.onUnitKilled(T)))}let C=0;for(const v of this.activeBlueIndices){if(C>=1+h)break;const T=this.units[v];!T.active||T.kind!=="normal"||(T.x-t.x)**2+(T.z-t.z)**2<=5.2*5.2&&(T.kind="charged",T.maxHp*=1.8,T.hp=T.maxHp,T.dmg*=1.8,C++)}e&&w?this.triggerThorSuperRailgun():e&&this.spawnFloatingPopup(l,2.2,c,"⚡ 雷神球状闪电锤!","#facc15")}else if(u==="orbital"){const h=this.state.getSkillNodeRank("orbital_t1"),b=this.state.getSkillNodeRank("orbital_t2"),w=e?3.5+h*1.8:1.5+h*.8;if(this.state.orbitalCharge=Math.min(100,this.state.orbitalCharge+w),e){const y=1+b,C=this.findDensestRedCluster(3.5,3.5);for(let v=0;v<y;v++){const T=jt.clamp(C.x+(v-(y-1)*.5)*2.6,-7.2,7.2),P=jt.clamp(C.z-v%2*1.2,Mt+1.5,wt-1.8);this.spawnSkyPillar(T,P,14239471,1.8,.38),this.spawnShockwave(T,P,14239471,3.8,.35),this.spawnBurstParticles(T,1,P,14239471,20);for(const x of this.activeRedIndices){const M=this.units[x];M.active&&(M.x-T)**2+(M.z-P)**2<=3.5*3.5&&(M.hp-=t.dmg*.65,b>0&&(M.empTimer=Math.max(M.empTimer||0,b*1.5)),M.hp<=0&&(M.active=!1,this.onUnitKilled(M)))}}this.spawnFloatingPopup(l,2.2,c,`☄️ 聚变虹吸战术锤: 轰炸 +${Math.round(w)}%`,"#e879f9")}}else if(u==="bastion"){const h=this.state.getSkillNodeRank("bastion_t1"),b=this.state.getSkillNodeRank("bastion_t3");if(e){const w=Math.max(4,Math.round(this.playerBaseMaxHp*(.015+h*.01)));this.playerBaseHp<this.playerBaseMaxHp&&(this.playerBaseHp=Math.min(this.playerBaseMaxHp,this.playerBaseHp+w),this.lastKnownBaseHp=Math.max(this.lastKnownBaseHp,this.playerBaseHp));for(const y of this.activeBlueIndices){const C=this.units[y];C.active&&(C.x-t.x)**2+(C.z-t.z)**2<=6.2*6.2&&(C.hp=Math.min(C.maxHp,C.hp+C.maxHp*.35))}if(b>0)for(const y of this.gears)y.alive&&(y.cfg.x-t.x)**2+(y.cfg.z-c)**2<=7*7&&(y.hp=Math.max(0,y.hp-3),y.hp<=0&&(y.alive=!1,y.mesh.visible=!1,y.labelEl.style.display="none",this.spawnShockwave(y.cfg.x,y.cfg.z,4906624,4.2,.4)));this.spawnFloatingPopup(t.x,2.2,c,`🛡️ 翡翠圣盾镇压锤: 城防 +${w}HP`,"#4ade80")}}else if(u==="tycoon"){const h=this.state.getSkillNodeRank("tycoon_t1"),b=this.state.getSkillNodeRank("tycoon_t2");if(g>0||e){const w=this.state.addGold(h*4+Math.min(14,g*2)+3);e&&this.spawnFloatingPopup(t.x,2.2,c,`💰 点金财阀碎钞锤 +${w}⚡!`,"#facc15")}b>0&&this.lootBug.active&&e&&(this.lootBug.hp=Math.max(1,this.lootBug.hp-2),this.lootBug.hitFlash=1,this.spawnSkyPillar(this.lootBug.x,this.lootBug.z,16436245,1.4,.32))}else S?this.spawnFloatingPopup(t.x,2.2,c,"🔨 重锤破甲震飞!","#facc15"):g>=3&&Math.random()<.65&&this.spawnFloatingPopup(t.x,2,c,`🔨 震飞 ×${g}!`,"#00f0ff")}triggerBossBerserkPhase(){var n,s;if(this.bossBerserkTriggered)return;this.bossBerserkTriggered=!0,xt.playBossRoar(),xt.setBgmDanger(1),this.triggerScreenFlash("#ff2a55",.72),this.addCameraShake(.95),this.spawnSkyPillar(0,Mt+1,16722517,3.2,.65),this.spawnSkyPillar(-4.2,Mt+1.4,16436245,1.8,.52),this.spawnSkyPillar(4.2,Mt+1.4,16436245,1.8,.52),this.spawnShockwave(0,Mt+1,16722517,14,.7),this.spawnShockwave(0,Mt+1,16436245,9.5,.55),this.spawnBurstParticles(0,2.6,Mt+.8,16722517,95),this.spawnBurstParticles(0,2.2,Mt+1.2,16436245,45);const t=Math.max(1,((n=this.currentLevel)==null?void 0:n.id)||1);this.spawnUnit("red","brute",0,Mt+1.4,0,3),t>=3&&this.spawnUnit("red","shaman",3.5,Mt+1.2,.4,2.8);const e=Math.min(5,2+Math.floor(t/2));for(let a=0;a<e;a++){const o=-4+a*2.2+(Math.random()-.5)*.5;this.spawnUnit("red","baneling",o,Mt+1.8,(Math.random()-.5)*1.2,4.2)}(s=this.onBanner)==null||s.call(this,"⚠️ 母巢统领进入 50% 狂暴阶段！","狂暴卫队倾巢而出 · 全力迎战！")}simulateUnits(t){var u,f,m,p,S;this.gridMap.clear(),this.gridCellPoolUsed=0,this.activeBlueIndices.length=0,this.activeRedIndices.length=0,this.activeAegisIndices.length=0;let e=-99;for(let g=0;g<Qe;g++){const h=this.units[g];h.active&&(h.team==="blue"?(this.activeBlueIndices.push(g),h.kind==="champion"&&h.mechaType==="aegis"&&this.activeAegisIndices.push(g)):(this.activeRedIndices.push(g),h.z>e&&(e=h.z)))}xt.setBgmDanger(this.bossBerserkTriggered||e>7.5?1:0);const n=this.activeBlueIndices.length,s=this.activeRedIndices.length,a=this.state.getGiantTrooperSpec(),o=this.state.getBastionTrooperSpec(),r=this.state.getUltimateEvolutionSpec(),l=this.state.getSkillNodeRank("swarm_t2"),c=l>0?1+Math.min(l*.1,Math.floor(n/15)*(l*.02)):1,d=(this.adrenalineTimer>0?1.18:1)*c;for(let g=0;g<Qe;g++){const h=this.units[g];if(!h.active)continue;if(h.age+=t,h.specialTimer+=t,h.fusionCooldown&&h.fusionCooldown>0&&(h.fusionCooldown=Math.max(0,h.fusionCooldown-t)),h.empTimer&&h.empTimer>0&&(h.empTimer=Math.max(0,h.empTimer-t)),h.attackCooldown>0&&(h.attackCooldown=Math.max(0,h.attackCooldown-t)),h.attackAnim>0&&(h.attackAnim=Math.max(0,h.attackAnim-t*3.4)),h.spawnHop>0){const A=h.spawnHop>.68?2.55:4.2;h.spawnHop=Math.max(0,h.spawnHop-t*A)}if(h.team==="blue"&&h.kind==="champion"){const A=h.mechaType||"hammer";if(A==="hammer"&&h.specialTimer>=1.05)h.specialTimer=0,h.attackAnim=1,h.spawnHop=1.15,this.triggerHammerSlam(h,!0);else if(A==="pyro"&&h.specialTimer>=.24){h.specialTimer=0,h.attackAnim=.85,this.spawnBurstParticles(h.x,1.1,h.z-1.6,16347926,Math.round(8+r.tier*4)),r.tier>=1&&this.spawnBurstParticles(h.x,1.2,h.z-2.2,16436245,Math.round(4+r.tier*3)),this.spawnShockwave(h.x,h.z-1.8,16347926,3*r.radiusMult,.28);for(let E=0;E<this.activeRedIndices.length;E++){const I=this.units[this.activeRedIndices[E]];if(!I.active)continue;const V=I.x-h.x,$=I.z-h.z,Q=r.radiusMult*(1+this.state.getSkillNodeRank("titan_t3")*.08);if($<.8&&$>-4.2*Q&&Math.abs(V)<=2.4*Q){const it=h.dmg*(I.kind==="baneling"?1.2:.48)*Q;I.hp-=it,I.hp<=0&&(I.active=!1,this.onUnitKilled(I))}}}else if(h.mechaType==="aegis"&&h.specialTimer>=.55){h.specialTimer=0;const E=4.2*r.radiusMult;this.spawnShockwave(h.x,h.z,2278750,E,.45),this.spawnBurstParticles(h.x,1,h.z,2278750,Math.round(8+r.tier*4));for(let I=0;I<this.activeBlueIndices.length;I++){const V=this.units[this.activeBlueIndices[I]];if(!V.active)continue;const $=V.x-h.x,Q=V.z-h.z;$*$+Q*Q<=(E*.9)**2&&(V.hp=Math.min(V.maxHp,V.hp+V.maxHp*.16))}}}else if(h.team==="red"&&h.kind==="shaman"&&h.specialTimer>=2.6){h.specialTimer=0,h.attackAnim=1,xt.playShamanPulse(),this.spawnShockwave(h.x,h.z,12616956,3.8,.48),this.spawnBurstParticles(h.x,1.3,h.z,14239471,18);for(let A=0;A<this.activeRedIndices.length;A++){const E=this.units[this.activeRedIndices[A]];if(!E.active)continue;const I=E.x-h.x,V=E.z-h.z;I*I+V*V<=3.2*3.2&&(E.hp=Math.min(E.maxHp,E.hp+E.maxHp*.15),E.spawnHop=Math.max(E.spawnHop,.4))}}const b=h.x,w=h.z,y=h.team==="red"&&h.empTimer&&h.empTimer>0?.4:1,C=h.team==="blue"?h.speed*d:h.speed*y;if(h.team==="blue"){let A=0,E=-C,I=!1;for(const $ of this.nests){if(!$.alive)continue;const Q=$.cfg.x-h.x,it=$.cfg.z-h.z,W=Math.hypot(Q,it);if(W<4.2&&it<1.8){if(I=!0,W<2.1){if(A=0,E=0,h.attackCooldown<=0){h.attackCooldown=.4,h.attackAnim=1;const j=this.state.getSiegeDamageMultiplier();if($.hp=Math.max(0,$.hp-h.dmg*.65*j),$.hitFlash=1,this.spawnBurstParticles(h.x,1.2,h.z,8702998,6),$.hp<=0&&$.alive){$.alive=!1,$.group.visible=!1,$.labelEl.style.display="none",xt.playExplosion(),this.triggerScreenFlash("#facc15",.48),this.addCameraShake(.65),this.spawnSkyPillar($.cfg.x,$.cfg.z,16436245,2.2,.52),this.spawnShockwave($.cfg.x,$.cfg.z,16436245,6.2,.55),this.spawnShockwave($.cfg.x,$.cfg.z,8702998,4,.4);const ht=this.state.addGold($.cfg.rewardGold);this.spawnBurstParticles($.cfg.x,1.8,$.cfg.z,16436245,65),this.spawnBurstParticles($.cfg.x,1.4,$.cfg.z,8702998,30),this.spawnFloatingPopup($.cfg.x,2.5,$.cfg.z,`+${ht} ⚡ 巢穴击破!`,"#facc15"),(u=this.onBanner)==null||u.call(this,`💥 摧毁 ${$.cfg.name}！`,`奖励 +${ht} 基因金币 & 泰坦充能！`),this.state.championCharge=Math.min(100,this.state.championCharge+40)}}}else A=Q/Math.max(.2,W)*C,E=it/Math.max(.2,W)*C;break}}const V=this.findTargetEnemy(h,this.activeRedIndices);if(!I){const $=h.z<-9.5,Q=V.target?V.target.z>5:!1,it=$?8.5:Q?14.5:11.5;if(V.target&&!V.blocked&&V.dist<it){const W=V.target.x-h.x,j=V.target.z-h.z,ht=Math.max(.01,V.dist);A=W/ht*C,E=j/ht*C}else if($||!V.target){const W=0-h.x,j=Mt+.55-h.z,ht=Math.max(.01,Math.hypot(W,j));ht>.65?(A=W/ht*C,E=j/ht*C):(A=0,E=0)}else A=0,E=-C}h.spawnHop>.68?(h.vx=jt.lerp(h.vx,0,t*3),h.vz=-Math.max(13.8,C*1.65)):(h.vx=jt.lerp(h.vx,A,t*8.5),h.vz=jt.lerp(h.vz,E,t*8.5))}else{let A=0,E=C;const I=this.findTargetEnemy(h,this.activeBlueIndices);if(I.target&&!I.blocked&&I.dist<7.5&&Math.abs(I.target.x-h.x)<4.2){const V=I.target.x-h.x,$=I.target.z-h.z,Q=Math.max(.01,I.dist);A=V/Q*C,E=$/Q*C}else A=0,E=C;h.vx=jt.lerp(h.vx,A,t*7.5),h.vz=jt.lerp(h.vz,E,t*7.5)}if(h.spawnHop<=.68)for(const A of this.walls)this.applyWallLookAhead(h,A,t);h.x+=h.vx*t,h.z+=h.vz*t;for(const A of this.zones){const E=A.cfg;if(Math.abs(h.x-E.x)<=E.width*.5&&Math.abs(h.z-E.z)<=E.length*.5)if(E.type==="speed_belt")h.team==="blue"?(h.z-=4.2*t,h.vz=Math.min(h.vz,-C*1.65),Math.random()<.08&&this.spawnBurstParticles(h.x,.35,h.z,61695,1)):h.z-=2.8*t;else if(E.type==="jump_pad")h.spawnHop<=.35&&(h.spawnHop=2.15,h.vz=h.team==="blue"?-Math.max(14.2,C*1.72):8.5,h.z+=h.team==="blue"?-.95:.65,this.jumpPadSoundCooldown<=0&&(this.jumpPadSoundCooldown=.22,xt.playCloneGate(2),this.spawnShockwave(E.x,E.z,16020150,2.4,.28)),Math.random()<.45&&this.spawnBurstParticles(h.x,.45,h.z,61695,3));else if(E.type==="toxic_mire"){if(h.spawnHop<=.68){const I=h.team==="red"?.42:.35;h.x-=h.vx*t*I,h.z-=h.vz*t*I;const V=h.fusionTier||0,$=h.team==="red"?.28:h.kind==="champion"||V>=2?.045:.16;if(h.hp-=h.maxHp*$*t,Math.random()<.06&&this.spawnBurstParticles(h.x,.3,h.z,10741301,1),h.hp<=0){h.active=!1,h.team==="red"&&this.onUnitKilled(h);break}}}else E.type==="heal_sanctuary"&&h.team==="blue"&&(h.hp=Math.min(h.maxHp,h.hp+h.maxHp*.36*t),h.z-=1.45*t,h.empTimer&&h.empTimer>0&&(h.empTimer=0))}if(!h.active)continue;if(h.spawnHop<=.68)for(const A of this.bumpers){const E=h.x-A.cfg.x,I=h.z-A.cfg.z,V=E*E+I*I,$=A.cfg.radius+h.radius;if(V<$*$&&V>1e-4){const Q=Math.sqrt(V),it=E/Q,W=I/Q;h.x=A.cfg.x+it*($+.08),h.z=A.cfg.z+W*($+.08);const j=Math.abs(it)>.15?Math.sign(it):h.id%2===0?1:-1;h.vx=j*8.2+it*3.6,h.vz+=W*2.8-(h.team==="blue"?1.8:0),h.spawnHop=Math.max(h.spawnHop,.55),h.team==="blue"&&(h.hp=Math.min(h.maxHp*1.15,h.hp+h.maxHp*.15)),A.pulseTimer<=.2&&this.spawnShockwave(A.cfg.x,A.cfg.z,14239471,2.4,.25),A.pulseTimer=1}}const v=ue-.65-h.radius;if(h.x<-v?(h.x=-v,h.vx=Math.abs(h.vx)*.5):h.x>v&&(h.x=v,h.vx=-Math.abs(h.vx)*.5),h.spawnHop<=.68)for(const A of this.walls)this.resolveWallCollision(h,A);const T=h.x-b,P=h.z-w,x=Math.hypot(T,P)/Math.max(.001,t);h.walkPhase+=Math.max(1.8,x*3.3)*t;const _=Math.hypot(h.vx,h.vz)>.25?Math.atan2(h.vx,h.vz):h.team==="blue"?Math.PI:0,N=Math.atan2(Math.sin(_-h.yaw),Math.cos(_-h.yaw));if(h.turnRate=jt.lerp(h.turnRate,N,Math.min(1,t*12)),h.yaw+=N*Math.min(1,t*14),h.team==="blue"&&h.spawnHop<=.68)for(const A of this.gears){if(!A.alive)continue;const E=h.x-A.cfg.x,I=h.z-A.cfg.z;if(Math.hypot(E,I)<A.cfg.radius+h.radius){const $=this.state.getSkillNodeRank("bastion_t3"),Q=$*.15,it=h.fusionTier||0;h.kind==="champion"?h.hp=Math.max(1,h.hp-h.maxHp*.25):it>=2?(h.hp-=h.maxHp*.42,h.hp<=0&&(h.active=!1)):it===1?(h.hp-=h.maxHp*.6,h.hp<=0&&(h.active=!1)):$>0?Math.random()>=Q&&(h.hp-=h.maxHp*Math.max(.24,.55-$*.1),h.hp<=0&&(h.active=!1)):Math.random()>=Q&&(h.active=!1);const W=h.kind==="champion"?6:it>=2?2:1+($>0?1:0),j=Math.max(1,Math.round(W*this.state.getSiegeDamageMultiplier()));if(A.hp=Math.max(0,A.hp-j),A.hitFlash=1,xt.playGearGrind(),this.spawnBurstParticles(h.x,.7,h.z,16347926,10),A.hp<=0){A.alive=!1,A.mesh.visible=!1,A.labelEl.style.display="none",xt.playExplosion();const ht=this.state.addGold(22);this.state.championCharge=Math.min(100,this.state.championCharge+15),this.triggerScreenFlash("#f97316",.42),this.addCameraShake(.55),this.spawnSkyPillar(A.cfg.x,A.cfg.z,16347926,1.8,.45),this.spawnShockwave(A.cfg.x,A.cfg.z,16347926,4.8,.48),this.spawnShockwave(A.cfg.x,A.cfg.z,16436245,2.8,.34),this.spawnBurstParticles(A.cfg.x,1,A.cfg.z,16722517,55),this.spawnBurstParticles(A.cfg.x,1.2,A.cfg.z,16436245,25),this.spawnFloatingPopup(A.cfg.x,1.8,A.cfg.z,`⚙️ 齿轮粉碎! +${ht}⚡`,"#facc15")}break}}if(!h.active)continue;if(h.team==="blue")for(const A of this.barrels){if(!A.alive)continue;const E=h.x-A.cfg.x,I=h.z-A.cfg.z;if(Math.hypot(E,I)<.78+h.radius){const $=h.fusionTier||0;h.kind!=="champion"&&$<2?h.active=!1:h.kind!=="champion"&&(h.hp-=h.maxHp*.45,h.hp<=0&&(h.active=!1));const Q=h.kind==="champion"?99:$>=2?2:1;A.hp=Math.max(0,A.hp-Q),this.spawnBurstParticles(A.cfg.x,1,A.cfg.z,16436245,8),A.hp<=0&&this.detonateBarrel(A);break}}if(!h.active)continue;if(h.team==="blue"&&this.lootBug.active){const A=h.x-this.lootBug.x,E=h.z-this.lootBug.z;if(Math.hypot(A,E)<1.18+h.radius){const V=h.fusionTier||0;h.kind!=="champion"&&V<2?h.active=!1:h.kind!=="champion"&&(h.hp-=h.maxHp*.4,h.hp<=0&&(h.active=!1));const $=h.kind==="champion"?99:V>=2?2:1;if(this.lootBug.hp=Math.max(0,this.lootBug.hp-$),this.lootBug.hitFlash=1,this.state.addGold(2),this.spawnBurstParticles(this.lootBug.x,.9,this.lootBug.z,16436245,10),this.lootBug.hp<=0){this.lootBug.active=!1,this.lootBug.spawnTimer=17.5,this.lootBugGroup.visible=!1,this.lootBugLabelEl&&(this.lootBugLabelEl.style.display="none"),xt.playExplosion();const Q=Math.max(1,((f=this.currentLevel)==null?void 0:f.id)||1),it=1+this.state.getSkillNodeRank("tycoon_t2")*.25,W=this.state.addGold(Math.round(90*Math.pow(1.08,Math.min(Q-1,20))*it));this.state.championCharge=Math.min(100,this.state.championCharge+45),this.state.orbitalCharge=Math.min(100,this.state.orbitalCharge+45),this.triggerScreenFlash("#facc15",.68),this.addCameraShake(.72),this.spawnSkyPillar(this.lootBug.x,this.lootBug.z,16436245,2.5,.58),this.spawnShockwave(this.lootBug.x,this.lootBug.z,16436245,5.8,.52),this.spawnShockwave(this.lootBug.x,this.lootBug.z,61695,3.6,.36),this.spawnBurstParticles(this.lootBug.x,1.2,this.lootBug.z,16436245,95),this.spawnBurstParticles(this.lootBug.x,1.5,this.lootBug.z,61695,35),this.spawnFloatingPopup(this.lootBug.x,2.4,this.lootBug.z,`💰 盗宝虫爆金 +${W}⚡!`,"#facc15"),(m=this.onBanner)==null||m.call(this,`💰 击破黄金盗宝虫！+${W}⚡`,"双大招立即充能 +45%！")}if(!h.active)continue}}if(h.team==="blue")for(const A of this.gates){if(h.passedGates.has(A.cfg.id))continue;if((w>=A.cfg.z&&h.z<=A.cfg.z||Math.abs(h.z-A.cfg.z)<.42)&&Math.abs(h.x-A.currentX)<=A.cfg.width*.52&&(h.passedGates.add(A.cfg.id),A.pulseTimer=1,this.applyGateEffect(h,A),!h.active))break}if(!h.active)continue;if(h.team==="blue"&&h.z<=Mt+1.15&&(h.z=Math.max(Mt+.5,h.z),h.attackCooldown<=0)){h.attackCooldown=.48/c,h.attackAnim=1;const A=this.state.getSiegeDamageMultiplier(),E=h.kind==="charged"?1+this.state.getSkillNodeRank("plasma_t3")*.18:1,I=h.fusionTier||0;let V=(h.kind==="champion"?h.dmg*.55:h.dmg*.25)*A*E;if(this.bossShieldActive){V*=.12;const $=h.kind==="champion"?7:I>=1?1+I:1;this.bossShieldHitsRemaining-=$,this.spawnBurstParticles(h.x,1.6,Mt+1,14239471,6),this.bossShieldHitsRemaining<=0&&this.shatterBossShield()}else this.spawnBurstParticles(h.x,1.4,Mt,61695,6),(Math.random()<.35||I>=2)&&this.spawnShockwave(h.x,Mt+.4,I>=2?16436245:61695,2.4+I*.45,.28);if(this.bossHp=Math.max(0,this.bossHp-V),this.bossHitFlash=1,Math.random()<.25&&this.state.addGold(1),(p=this.currentLevel)!=null&&p.isMegaBoss&&this.bossHp>0&&(!this.bossShield70Triggered&&this.bossHp<=this.bossMaxHp*.7?(this.bossShield70Triggered=!0,this.activateBossShieldPhase(!1)):!this.bossShield35Triggered&&this.bossHp<=this.bossMaxHp*.35&&(this.bossShield35Triggered=!0,this.activateBossShieldPhase(!1))),(S=this.currentLevel)!=null&&S.isMiniBoss&&this.bossHp>0&&!this.bossShield50Triggered&&this.bossHp<=this.bossMaxHp*.5&&(this.bossShield50Triggered=!0,this.activateBossShieldPhase(!0)),!this.bossBerserkTriggered&&this.bossHp>0&&this.bossHp<=this.bossMaxHp*.5&&this.triggerBossBerserkPhase(),this.bossHp<=0){this.finishStage(!0);return}}if(h.team==="red"&&h.z>=wt-2.2){if(h.z=Math.min(wt-1.8,h.z),h.kind==="baneling"){if(this.playerBaseHp=Math.max(0,this.playerBaseHp-h.dmg*.65),this.detonateBaneling(h),this.playerBaseHp<=0){xt.playExplosion(),this.finishStage(!1);return}continue}if(h.attackCooldown<=0){h.attackCooldown=.55,h.attackAnim=1;const A=h.dmg*.42;if(this.playerBaseHp=Math.max(0,this.playerBaseHp-A),this.spawnBurstParticles(h.x,.9,wt-1.2,16722517,3),Math.random()<.3&&this.addCameraShake(.14),this.playerBaseHp<=0){xt.playExplosion(),this.finishStage(!1);return}}}const U=Math.floor((h.x+20)/this.gridCellSize),H=Math.floor((h.z+30)/this.gridCellSize),z=U*1e3+H;let L=this.gridMap.get(z);L||(this.gridCellPoolUsed<this.gridCellPool.length?(L=this.gridCellPool[this.gridCellPoolUsed++],L.length=0):(L=[],this.gridCellPool.push(L),this.gridCellPoolUsed++),this.gridMap.set(z,L)),L.push(g)}for(let g=0;g<Qe;g++){const h=this.units[g];if(!h.active)continue;const b=Math.floor((h.x+20)/this.gridCellSize),w=Math.floor((h.z+30)/this.gridCellSize);for(let y=-1;y<=1;y++){for(let C=-1;C<=1;C++){const v=this.gridMap.get((b+y)*1e3+(w+C));if(v){for(let T=0;T<v.length;T++){const P=v[T];if(P<=g)continue;const x=this.units[P];if(!x.active)continue;const M=x.x-h.x,_=x.z-h.z,N=h.radius+x.radius,U=M*M+_*_;if(h.team==="blue"&&x.team==="blue"&&a.isGiantMode&&a.maxFusionTier>1&&h.kind!=="champion"&&x.kind!=="champion"&&h.age>.35&&x.age>.35&&(h.fusionCooldown||0)<=0&&(x.fusionCooldown||0)<=0){const H=h.fusionTier||1,z=x.fusionTier||1;if(H===z&&H<a.maxFusionTier){const L=N*1.12;if(U<=L*L){x.active=!1,this.promoteGiantUnit(h,H+1,x.maxHp,x.dmg,x.hp);continue}else if(U<=1.85*1.85&&U>1e-4){const A=1/Math.sqrt(U),E=2.1*t;h.vx+=M*A*E,h.vz+=_*A*E*.4,x.vx-=M*A*E,x.vz-=_*A*E*.4}}}if(U<N*N&&U>1e-5){const H=Math.sqrt(U),z=M/H,L=_/H;if(h.team===x.team){const A=(N-H)*.44;h.x-=z*A,h.z-=L*A,x.x+=z*A,x.z+=L*A;const E=(h.vx+x.vx)*.5,I=(h.vz+x.vz)*.5;h.vx=jt.lerp(h.vx,E,.08),h.vz=jt.lerp(h.vz,I,.08),x.vx=jt.lerp(x.vx,E,.08),x.vz=jt.lerp(x.vz,I,.08)}else{const A=h.team==="blue"?h:x,E=h.team==="red"?h:x;if(E.kind==="baneling"){if(this.detonateBaneling(E),!h.active)break;continue}const I=(N-H)*.52;if(h.x-=z*I,h.z-=L*I,x.x+=z*I,x.z+=L*I,h.attackCooldown<=0||x.attackCooldown<=0){if(A.attackCooldown<=0){A.attackCooldown=.35/c,A.attackAnim=1;const V=E.kind==="brute"||E.kind==="shaman",$=this.state.getSkillNodeRank("plasma_t3"),Q=V&&A.kind==="charged"?1+$*.18:1;V&&A.kind==="charged"&&$>0&&(E.empTimer=Math.max(E.empTimer||0,1.2+$*.35));const it=E.empTimer&&E.empTimer>0?1.28:1;E.hp-=A.dmg*Q*it;const W=A.fusionTier||0;if((W>=2||W===1&&this.state.getSkillNodeRank("titan_t3")>0)&&a.cleaveRatio>0){const dt=a.cleaveRadius+(W-1)*.25,Rt=A.dmg*(a.cleaveRatio+(W-1)*.04);if(W>=2||this.state.getSkillNodeRank("titan_t3")>0){const Pt=W>=3?16436245:W===2?16347926:3718648;this.spawnShockwave(E.x,E.z,Pt,dt*.9,.2)}for(let Pt=0;Pt<this.activeRedIndices.length;Pt++){const kt=this.units[this.activeRedIndices[Pt]];if(!kt.active||kt===E)continue;const Kt=kt.x-E.x,st=kt.z-E.z;Kt*Kt+st*st<=dt*dt&&(kt.hp-=Rt,kt.vz-=1.2+W*.55,kt.hp<=0&&(kt.active=!1,this.onUnitKilled(kt)))}}const ht=this.state.getSkillNodeRank("plasma_t2");if(ht>0&&(A.kind==="charged"||A.isMiniGiant)&&Math.random()<.5){let dt=ht+1;this.spawnShockwave(E.x,E.z,16436245,2.2,.22);for(let Rt=0;Rt<this.activeRedIndices.length&&dt>0;Rt++){const Pt=this.units[this.activeRedIndices[Rt]];if(!Pt.active||Pt===E)continue;(Pt.x-E.x)**2+(Pt.z-E.z)**2<=3.8*3.8&&(dt--,Pt.hp-=A.dmg*(.4+ht*.12),this.spawnBurstParticles(Pt.x,.9,Pt.z,16436245,6),Pt.hp<=0&&(Pt.active=!1,this.onUnitKilled(Pt)))}}A.kind==="champion"&&(A.mechaType||"hammer")==="hammer"&&this.triggerHammerSlam(A)}if(E.attackCooldown<=0&&E.active){E.attackCooldown=.35,E.attackAnim=1;const V=this.isNearAegisTitan(A.x,A.z),$=(A.fusionTier||0)>=1?1-a.dmgReduction:1,Q=1-o.trooperDmgReduction,it=(V?.5:1)*$*Q;A.hp-=E.dmg*it;const W=this.state.getSkillNodeRank("titan_t3");V&&W>0&&(E.hp-=E.dmg*(W*.1))}if(h.vx-=z*2.4,h.vz-=L*2.4,x.vx+=z*2.4,x.vz+=L*2.4,h.hp<=0&&h.active&&(h.active=!1,this.onUnitKilled(h)),x.hp<=0&&x.active&&(x.active=!1,this.onUnitKilled(x)),!E.active&&A.active&&this.state.getSkillNodeRank("swarm_t4")>0&&Math.random()<.18&&(this.spawnUnit("blue",A.kind==="champion"?"charged":A.kind,E.x,E.z,(Math.random()-.5)*3,-A.speed,A.passedGates),this.spawnBurstParticles(E.x,.8,E.z,3718648,8)),!h.active)break}}}}if(!h.active)break}}if(!h.active)break}}this.activeBlueCount=n,this.activeRedCount=s}applyWallLookAhead(t,e,n){const s=e.x2-e.x1,a=e.z2-e.z1,o=s*s+a*a;if(o<.01)return;const r=t.x+t.vx*.16,l=t.z+t.vz*.16,c=r-e.x1,d=l-e.z1,u=jt.clamp((c*s+d*a)/o,0,1),f=e.x1+s*u,m=e.z1+a*u,p=r-f,S=l-m,g=p*p+S*S,h=t.radius+.95;if(g<h*h&&g>1e-4&&Math.abs(s)>.25){const b=Math.sqrt(o);let w=s/b,y=a/b;const C=t.team==="blue"?-1:1;if(Math.abs(a)<.25){const T=(e.x1+e.x2)*.5;w=t.x>=T?1:-1,y=C*.35}else y*C<0&&(w=-w,y=-y);const v=(1-Math.sqrt(g)/h)*6.5*n;t.vx=jt.lerp(t.vx,w*t.speed,Math.min(1,v)),t.vz=jt.lerp(t.vz,y*t.speed,Math.min(1,v))}}resolveWallCollision(t,e){const n=e.x2-e.x1,s=e.z2-e.z1,a=t.x-e.x1,o=t.z-e.z1,r=n*n+s*s;if(r===0)return;const l=jt.clamp((a*n+o*s)/r,0,1),c=e.x1+n*l,d=e.z1+s*l,u=t.x-c,f=t.z-d,m=u*u+f*f,p=t.radius+.36;if(m<p*p&&m>1e-5){const S=Math.sqrt(m),g=u/S,h=f/S,b=p-S;if(t.x+=g*b,t.z+=h*b,Math.abs(n)>.2){let w;if(Math.abs(s)<.25){const y=(e.x1+e.x2)*.5;w=t.x>=y?1:-1}else{const y=e.z2<e.z1?Math.sign(n):-Math.sign(n);w=t.team==="blue"?y:-y}t.vx+=w*4.2}}}detonateBarrel(t){if(!t.alive)return;t.alive=!1,t.mesh.visible=!1,t.labelEl.style.display="none",xt.playExplosion(),this.triggerScreenFlash("#f97316",.65),this.addCameraShake(.75),this.spawnSkyPillar(t.cfg.x,t.cfg.z,16347926,2.4,.52),this.spawnShockwave(t.cfg.x,t.cfg.z,16347926,6.2,.52),this.spawnShockwave(t.cfg.x,t.cfg.z,16436245,4,.36),this.spawnBurstParticles(t.cfg.x,1.2,t.cfg.z,16347926,65),this.spawnBurstParticles(t.cfg.x,1.5,t.cfg.z,16436245,35);const e=5.8*5.8;let n=0;for(let a=0;a<Qe;a++){const o=this.units[a];if(!o.active||o.team!=="red")continue;const r=o.x-t.cfg.x,l=o.z-t.cfg.z;r*r+l*l<=e&&(o.kind==="brute"||o.kind==="shaman"?(o.hp-=o.maxHp*.7,o.vz-=6.5,o.hp<=0&&(o.active=!1,n++,this.onUnitKilled(o))):(o.active=!1,n++,this.onUnitKilled(o)))}for(const a of this.gears)a.alive&&(a.cfg.x-t.cfg.x)**2+(a.cfg.z-t.cfg.z)**2<=6.2*6.2&&(a.hp=Math.max(0,a.hp-5),a.hitFlash=1,a.hp<=0&&(a.alive=!1,a.mesh.visible=!1,a.labelEl.style.display="none",this.spawnShockwave(a.cfg.x,a.cfg.z,16347926,4.5,.45),this.spawnFloatingPopup(a.cfg.x,1.8,a.cfg.z,"⚙️ 爆破震碎齿轮!","#facc15")));for(const a of this.nests)a.alive&&(a.cfg.x-t.cfg.x)**2+(a.cfg.z-t.cfg.z)**2<=6.8*6.8&&(a.hp=Math.max(1,a.hp-a.maxHp*.3),a.hitFlash=1,this.spawnFloatingPopup(a.cfg.x,2.2,a.cfg.z,"💥 爆破波及巢穴 -30%!","#f97316"));const s=this.state.addGold(15+n*2);this.spawnFloatingPopup(t.cfg.x,2.2,t.cfg.z,`💥 链式爆破 -${n} (+${s}⚡)`,"#facc15"),this.bossShieldActive&&this.shatterBossShield();for(const a of this.barrels){if(!a.alive||a===t)continue;(a.cfg.x-t.cfg.x)**2+(a.cfg.z-t.cfg.z)**2<=6.2*6.2&&this.detonateBarrel(a)}}activateBossShieldPhase(t=!1){var e,n;this.bossShieldActive=!0,this.bossShieldHitsRemaining=t?14:24,this.bossShieldMesh&&(this.bossShieldMesh.visible=!0),xt.playBossRoar(),this.triggerScreenFlash(t?"#f97316":"#d946ef",.65),this.addCameraShake(.82),this.spawnSkyPillar(0,Mt+1.2,t?16347926:14239471,3,.6),this.spawnShockwave(0,Mt+1.2,t?16347926:14239471,11.5,.6),this.spawnUnit("red","brute",-3.2,Mt+1.5,0,3.2),this.spawnUnit("red","shaman",3.2,Mt+1.5,0,3),t?(this.spawnUnit("red","brute",0,Mt+1.6,0,3.3),this.spawnFloatingPopup(0,3.2,Mt+1.5,"🛡️ 小Boss先锋护盾开启(14次/炸桶破盾)!","#fdba74"),(e=this.onBanner)==null||e.call(this,"👹 小Boss开启【先锋力场护盾】！","集火冲击14次或释放技能/炸桶即可瞬间破盾！")):(this.spawnFloatingPopup(0,3.2,Mt+1.5,"🛡️ 虚空护盾开启! 集火或引爆裂变桶破盾!","#f0abfc"),(n=this.onBanner)==null||n.call(this,"🛡️ 大Boss开启【虚空护盾】！","集火冲击护盾或引爆桥面裂变桶即可破盾重创！"))}shatterBossShield(){var e;if(!this.bossShieldActive)return;this.bossShieldActive=!1,this.bossShieldHitsRemaining=0,this.bossShieldMesh&&(this.bossShieldMesh.visible=!1),xt.playExplosion(),this.triggerScreenFlash("#00f0ff",.72),this.addCameraShake(.92),this.spawnSkyPillar(0,Mt+1,61695,3.4,.65),this.spawnShockwave(0,Mt+1,61695,12.5,.62),this.spawnBurstParticles(0,2.5,Mt+1,61695,85),this.spawnBurstParticles(0,2.5,Mt+1,14239471,45);const t=Math.round(this.bossMaxHp*.1);this.bossHp=Math.max(1,this.bossHp-t),this.enemySpawnTimer=-2.2,this.spawnFloatingPopup(0,3.2,Mt+1,`💥 护盾击碎! Boss重创 -${t}!`,"#00f0ff"),(e=this.onBanner)==null||e.call(this,"💥 虚空护盾已被击碎！",`母巢遭受反噬重创 -${t} HP！`)}corruptRandomBlueGate(){const t=this.gates.filter(n=>n.cfg.op==="add");if(t.length===0)return;const e=t[Math.floor(Math.random()*t.length)];e.cfg.op="sub",e.cfg.value=2,e.cfg.style="hazard",e.chargeHits=0,e.pulseTimer=1.4,e.pillarMat.color.setHex(15248696),e.pillarMat.emissive.setHex(3875590),e.shieldMat.map=this.getGateBannerTexture("hazard","-2"),e.shieldMat.needsUpdate=!0,e.labelEl.className="gate-label hazard-gate",e.labelEl.textContent="-2",this.spawnSkyPillar(e.currentX,e.cfg.z,16346752,1.8,.48),this.spawnShockwave(e.currentX,e.cfg.z,16346752,4,.42),this.spawnBurstParticles(e.currentX,1.2,e.cfg.z,16346752,38),this.spawnFloatingPopup(e.currentX,2.2,e.cfg.z,"⚠️ 应援旗被染红! 快冲锋翻旗!","#f96e80")}updateMegaBossMechanics(t){var a,o;const e=!!((a=this.currentLevel)!=null&&a.isMegaBoss),n=!!((o=this.currentLevel)!=null&&o.isMiniBoss);if(this.bossShieldActive&&(this.bossHp=Math.min(this.bossMaxHp,this.bossHp+this.bossMaxHp*.006*t),this.bossShieldMesh)){const r=1+Math.sin(this.elapsedTime*10)*.05;this.bossShieldMesh.scale.set(r,r,r)}if(e&&(this.megaBossCurseTimer-=t,this.megaBossCurseTimer<=0&&(this.megaBossCurseTimer=12,this.corruptRandomBlueGate()),this.megaBossSlamTimer-=t,this.megaBossSlamTimer<=0)){this.megaBossSlamTimer=9.2,xt.playBossRoar(),this.triggerContinuousQuake(.68,1.15),this.triggerScreenFlash("#ff0044",.62),this.spawnSkyPillar(-4.2,Mt+1.5,16711748,2.5,.55),this.spawnSkyPillar(4.2,Mt+1.5,16711748,2.5,.55),this.spawnShockwave(0,Mt+1.5,16711748,15.5,.65),this.spawnFloatingPopup(0,3.2,Mt+1.8,"👑 大Boss深渊震击 · 处刑卫队出击!","#ff2a55");for(const r of this.activeBlueIndices){const l=this.units[r];l.active&&(l.vz+=5.2)}this.spawnUnit("red","brute",0,Mt+1.6,0,3.4);for(const r of[-4.5,-1.5,1.5,4.5])this.spawnUnit("red","baneling",r,Mt+1.9,(Math.random()-.5)*.8,4.5)}if(n&&(this.miniBossWarCryTimer-=t,this.miniBossWarCryTimer<=0)){this.miniBossWarCryTimer=9.2,xt.playBossRoar(),this.addCameraShake(.55),this.spawnSkyPillar(0,Mt+1.2,16347926,2.2,.48),this.spawnShockwave(0,Mt+1.2,16347926,11,.55),this.spawnFloatingPopup(0,3,Mt+1.5,"👹 小Boss狂暴战吼 · 红军全线冲锋!","#fb923c");for(const r of this.activeRedIndices){const l=this.units[r];l.active&&(l.vz+=2.6,l.spawnHop=Math.max(l.spawnHop,.55))}}if(this.meteorTelegraphs.some(r=>r.active))for(const r of this.meteorTelegraphs){if(!r.active)continue;r.timer-=t;const l=1-Math.max(0,r.timer)/r.maxTimer,c=r.radius*(.4+.6*l);if(r.mesh.scale.set(c,c,c),r.mat.opacity=.45+.5*Math.abs(Math.sin(this.elapsedTime*16)),r.timer<=0)if(r.active=!1,r.mesh.visible=!1,xt.playExplosion(),e&&r.isTurretLock?this.triggerContinuousQuake(.52,1.08):this.addCameraShake(.65),this.spawnSkyPillar(r.x,r.z,16722517,2.5,.52),this.spawnShockwave(r.x,r.z,16722517,r.radius*1.7,.48),this.spawnBurstParticles(r.x,1,r.z,16722517,65),r.isTurretLock)if(Math.abs(this.turretX-r.x)<=r.radius){const d=Math.round(this.playerBaseMaxHp*.15);if(this.playerBaseHp=Math.max(0,this.playerBaseHp-d),this.triggerScreenFlash("#ff2a55",.65),this.spawnFloatingPopup(r.x,2.2,r.z,`💥 陨石命中战车! 基地 -${d}HP!`,"#ff2a55"),this.playerBaseHp<=0){this.finishStage(!1);return}}else this.state.championCharge=Math.min(100,this.state.championCharge+15),this.state.orbitalCharge=Math.min(100,this.state.orbitalCharge+15),this.spawnFloatingPopup(this.turretX,2.2,wt-1.4,"✨ 完美闪避陨石! 充能+15%","#00f0ff");else{const d=r.radius*r.radius;for(const u of this.activeBlueIndices){const f=this.units[u];!f.active||f.kind==="champion"||(f.x-r.x)**2+(f.z-r.z)**2<=d&&(f.active=!1)}}}else if(this.megaBossMeteorTimer-=t,this.megaBossMeteorTimer<=0){this.megaBossMeteorTimer=e?6.2:8.5;const r=this.meteorTelegraphs[0];if(r.active=!0,r.x=this.turretX,r.z=wt-1.4,r.radius=e?2.5:2.3,r.maxTimer=2,r.timer=2,r.isTurretLock=!0,r.mesh.position.set(r.x,.16,r.z),r.mesh.visible=!0,this.spawnFloatingPopup(r.x,2,r.z,"⚠️ Boss陨石锁定战车！快横向走位闪避！","#ff2a55"),e){const l=this.meteorTelegraphs[1];l.active=!0,l.x=-3.8+(Math.random()-.5)*3,l.z=-1.5+(Math.random()-.5)*4.5,l.radius=3.2,l.maxTimer=2,l.timer=2,l.isTurretLock=!1,l.mesh.position.set(l.x,.16,l.z),l.mesh.visible=!0;const c=this.meteorTelegraphs[2];c&&(c.active=!0,c.x=3.8+(Math.random()-.5)*3,c.z=3.2+(Math.random()-.5)*4.5,c.radius=3.2,c.maxTimer=2,c.timer=2,c.isTurretLock=!1,c.mesh.position.set(c.x,.16,c.z),c.mesh.visible=!0)}}}flipHazardGateToBlue(t){if(t.cfg.op="add",t.cfg.value=1,t.cfg.style="blue",t.chargeHits=0,t.pulseTimer=1.4,t.pillarMat.color.setHex(15248696),t.pillarMat.emissive.setHex(3875590),t.shieldMat.map=this.getGateBannerTexture("blue","+1"),t.shieldMat.needsUpdate=!0,t.labelEl.className="gate-label",t.labelEl.textContent="+1",xt.playCloneGate(3),this.addCameraShake(.45),this.spawnSkyPillar(t.currentX,t.cfg.z,2672634,1.9,.45),this.spawnShockwave(t.currentX,t.cfg.z,2672634,4.2,.42),this.spawnBurstParticles(t.currentX,1.2,t.cfg.z,2672634,42),this.spawnFloatingPopup(t.currentX,2.2,t.cfg.z,"✨ 应援旗翻蓝! 变为 +1","#38bdf8"),this.state.getSkillNodeRank("gate_t4")>0){const e=this.state.getMaxBlueGateCap();this.triggerScreenFlash("#22d3ee",.65),this.spawnShockwave(t.currentX,t.cfg.z,2282478,14.5,.58);for(const n of this.gates)n.cfg.op==="add"&&n.cfg.value<e&&(n.cfg.value+=1,this.syncBlueGateVisualStyle(n));for(const n of this.activeBlueIndices){const s=this.units[n];s.active&&(s.hp=s.maxHp)}for(const n of this.activeRedIndices){const s=this.units[n];s.active&&(s.z=Math.max(Mt+1.5,s.z-4.2),s.vz=-8.5,s.spawnHop=1.1)}this.spawnFloatingPopup(t.currentX,2.9,t.cfg.z,"👑 真理炼金脉冲! 全蓝门+1 & 全军满血!","#22d3ee")}}applyGateEffect(t,e){const{op:n,value:s}=e.cfg,a=this.state.getSkillNodeRank("gate_t1"),o=1+a,r=a>0?.6:1,l=this.state.getGiantTrooperSpec(),c=this.state.getSwarmTrooperSpec(),d=t.fusionTier||0;if(n==="sub"){if(t.kind==="champion")t.hp=Math.max(1,t.hp-t.maxHp*.28*r),e.chargeHits+=2*o;else if(d>=2)t.hp-=t.maxHp*.42*r,t.hp<=0&&(t.active=!1),e.chargeHits+=2*o;else if(d===1)t.hp-=t.maxHp*.65*r,t.hp<=0&&(t.active=!1),e.chargeHits+=1.5*o;else if(a>0&&Math.random()<a*.14?t.hp=Math.max(1,t.hp*.65):t.active=!1,e.chargeHits+=o,s>=3&&a===0)for(const T of this.activeBlueIndices){const P=this.units[T];if(!P.active||P===t||P.kind==="champion"||(P.fusionTier||0)>=1)continue;if((P.x-t.x)*(P.x-t.x)+(P.z-t.z)*(P.z-t.z)<=1.2){P.active=!1,this.spawnBurstParticles(P.x,.6,P.z,16722517,3);break}}if(this.state.championCharge=Math.max(0,this.state.championCharge-.8*r),xt.playGearGrind(),this.spawnBurstParticles(t.x,.6,t.z,16722517,6),e.chargeHits>=18)if(e.chargeHits=0,e.cfg.value<=1)this.flipHazardGateToBlue(e);else{e.cfg.value-=1,e.pulseTimer=1.1;const T=`-${e.cfg.value}`;e.labelEl.textContent=T,e.shieldMat.map=this.getGateBannerTexture("hazard",T),e.shieldMat.needsUpdate=!0,this.spawnShockwave(e.currentX,e.cfg.z,16436245,2.6,.3),this.spawnFloatingPopup(e.currentX,1.9,e.cfg.z,`⚡ 红门削弱 -${e.cfg.value}`,"#facc15")}else Math.random()<.35&&this.spawnShockwave(t.x,e.cfg.z,16722517,1.8,.25);return}if(n==="div"){t.kind==="champion"?(t.hp=Math.max(1,t.hp-t.maxHp*.32*r),e.chargeHits+=2*o):d>=2?(t.hp-=t.maxHp*.45*r,t.hp<=0&&(t.active=!1),e.chargeHits+=2*o):d===1?(t.hp-=t.maxHp*.55*r,t.hp<=0&&(t.active=!1),e.chargeHits+=1.5*o):(e.chargeHits+=o,t.id%Math.max(2,s)!==0&&!(a>0&&Math.random()<a*.14)?(t.active=!1,xt.playGearGrind(),this.spawnBurstParticles(t.x,.6,t.z,16722517,6)):(t.hp=Math.max(1,t.hp*.75),this.spawnBurstParticles(t.x,.6,t.z,16347926,4))),this.state.championCharge=Math.max(0,this.state.championCharge-.6*r),e.chargeHits>=28&&this.flipHazardGateToBlue(e);return}if(t.kind==="champion"){t.hp=Math.min(t.maxHp,t.hp+t.maxHp*.16),this.spawnBurstParticles(t.x,1,e.cfg.z,61695,5);return}if(n==="add"){if(e.addCooldown>0)return;e.addCooldown=.09;const T=this.state.getSkillNodeRank("gate_t2"),P=this.state.getMaxBlueGateCap();e.chargeHits+=(d>=2?1.5:1)+a*.4+T*.55;const x=42+e.cfg.value*16;e.chargeHits>=x&&e.cfg.value<P&&(e.chargeHits=0,e.cfg.value+=1,this.syncBlueGateVisualStyle(e),this.spawnSkyPillar(e.currentX,e.cfg.z,e.cfg.value>=6?14239471:61695,1.5,.35),this.spawnShockwave(e.currentX,e.cfg.z,16436245,3.2,.35),this.spawnFloatingPopup(e.currentX,2,e.cfg.z,e.cfg.value>=6?`👑 矩阵超载 +${e.cfg.value}(×2)!`:`⬆️ 门脉升级 +${e.cfg.value}!`,e.cfg.value>=6?"#f0abfc":"#facc15"))}else if(n==="mul"){if(e.addCooldown>0)return;e.addCooldown=.02}xt.playCloneGate(s);const u=this.state.getSkillChargeMultiplier()*(l.isGiantMode?1.45:1);this.state.championCharge=Math.min(100,this.state.championCharge+(n==="mul"?.55:.32)*u),this.state.orbitalCharge=Math.min(100,this.state.orbitalCharge+(n==="mul"?.16:.09)*u);const f=n==="add"?this.state.getGateBonusAdd():0,m=this.state.getSkillNodeRank("gate_t4")>0&&Math.random()<.22,p=c.gateExtraCloneChance>0&&Math.random()<c.gateExtraCloneChance,S=6+this.state.getSkillNodeRank("gate_t2"),g=Math.min(S,(n==="add"?s+f:s-1)+(p?1:0)),h=m?Math.min(S+2,g*2):g,b=l.isGiantMode?Math.max(1,Math.min(3,Math.ceil(h*.6))):h;m&&Math.random()<.45&&this.spawnFloatingPopup(t.x,1.9,e.cfg.z,"👑 炼金暴击 ×2!","#22d3ee");const w=this.state.getSkillNodeRank("gate_t3"),y=1+w*.16,C=1+w*.1;w>0&&(t.maxHp*=y,t.hp=t.maxHp,t.dmg*=C);for(let T=0;T<b;T++){const P=(Math.random()-.5)*Math.min(e.cfg.width*.72,2.4),x=-.15-Math.random()*.65,M=(Math.random()-.5)*(l.isGiantMode?3.2:4.6),_=this.spawnUnit("blue",d>=2?"normal":t.kind,jt.clamp(t.x+P,e.currentX-e.cfg.width*.45,e.currentX+e.cfg.width*.45),t.z+x,M,-t.speed,t.passedGates,!!t.isMiniGiant,l.isGiantMode?1:t.fusionTier);_&&w>0&&(_.maxHp*=y,_.hp=_.maxHp,_.dmg*=C)}const v=e.cfg.style==="mega"?14239471:61695;this.spawnBurstParticles(t.x,.75,e.cfg.z,v,n==="mul"?16:9),n==="mul"?(this.spawnShockwave(t.x,e.cfg.z,v,3.2,.34),Math.random()<.6&&this.spawnSkyPillar(t.x,e.cfg.z,v,1.35,.3),Math.random()<.35&&this.spawnFloatingPopup(t.x,1.6,e.cfg.z,`×${s}!`,e.cfg.style==="mega"?"#f0abfc":"#67e8f9")):Math.random()<.55&&this.spawnShockwave(t.x,e.cfg.z,v,2.1,.28)}onUnitKilled(t){var e;if(t.team==="red"){const n=this.state.getSkillChargeMultiplier();this.state.stageMutantsKilled++,this.killStreakCount++,this.killStreakWindowTimer=3.8,this.killStreakCount>=this.nextStreakMilestone&&(this.adrenalineTimer=5,xt.playKillStreak(),this.triggerScreenFlash("#facc15",.52),this.addCameraShake(.55),this.spawnSkyPillar(this.turretX,wt-1.2,16436245,2.4,.48),this.spawnShockwave(this.turretX,wt-1.2,16436245,5.2,.5),this.spawnBurstParticles(this.turretX,1.2,wt-1.2,16436245,48),this.spawnFloatingPopup(this.turretX,2.2,wt-1.5,`🔥 ${this.killStreakCount} 连杀!`,"#facc15"),(e=this.onBanner)==null||e.call(this,`🔥 ${this.killStreakCount} 连杀狂暴！`,""),this.nextStreakMilestone=this.nextStreakMilestone===25?50:this.nextStreakMilestone===50?80:this.nextStreakMilestone+40);const s=t.kind==="brute"||t.kind==="shaman";this.state.championCharge=Math.min(100,this.state.championCharge+(s?5.5:.55)*n),this.state.orbitalCharge=Math.min(100,this.state.orbitalCharge+(s?1.8:.16)*n);const a=this.state.getSkillNodeRank("tycoon_t1"),o=a*8;if(t.kind==="brute"){const r=this.state.addGold(25+o);this.addCameraShake(.42),this.spawnSkyPillar(t.x,t.z,16436245,2.1,.46),this.spawnShockwave(t.x,t.z,16436245,4.4,.46),this.spawnShockwave(t.x,t.z,16777215,2.6,.3),this.spawnBurstParticles(t.x,1,t.z,16436245,45),this.spawnBurstParticles(t.x,1.2,t.z,16722517,20),this.spawnFloatingPopup(t.x,1.5,t.z,`+${r} ⚡`,"#facc15")}else if(t.kind==="shaman"){const r=this.state.addGold(18+o);this.addCameraShake(.32),this.spawnSkyPillar(t.x,t.z,14239471,1.8,.42),this.spawnShockwave(t.x,t.z,14239471,3.8,.42),this.spawnBurstParticles(t.x,1,t.z,14239471,36),this.spawnFloatingPopup(t.x,1.5,t.z,`+${r} ⚡`,"#e879f9")}else if(t.kind==="baneling")this.state.addGold(2+a),this.spawnShockwave(t.x,t.z,8702998,2.3,.32),this.spawnBurstParticles(t.x,.6,t.z,8702998,22);else{this.spawnBurstParticles(t.x,.6,t.z,16722517,8);const r=.25+(a>0?.12:0);Math.random()<r&&(this.state.addGold(1+(a>0?1:0)),this.spawnShockwave(t.x,t.z,a>0?16436245:16722517,1.6,.24))}}else{this.spawnBurstParticles(t.x,.6,t.z,61695,5);const n=this.state.getSkillNodeRank("swarm_t3");if(n>0)if(t.kind==="champion"){this.spawnSkyPillar(t.x,t.z,3718648,2.2,.45),this.spawnShockwave(t.x,t.z,3718648,5.2,.45),this.spawnBurstParticles(t.x,1.2,t.z,3718648,45);const s=this.state.getSkillNodeRank("swarm_t4")>0,a=4+n*2;for(let o=0;o<a;o++){const r=o/a*Math.PI*2,l=this.spawnUnit("blue",s?"charged":"normal",t.x+Math.cos(r)*.9,t.z+Math.sin(r)*.9,Math.cos(r)*3.5,-8.5,t.passedGates);l&&(l.spawnHop=1.5)}this.spawnFloatingPopup(t.x,2.2,t.z,`🌊 泰坦殉爆裂变 +${a}兵!`,"#38bdf8")}else{this.spawnShockwave(t.x,t.z,3718648,2.15,.24);const s=t.dmg*(.28+n*.22);for(const a of this.activeRedIndices){const o=this.units[a];o.active&&(o.x-t.x)**2+(o.z-t.z)**2<=2.15*2.15&&(o.hp-=s,o.hp<=0&&(o.active=!1,this.onUnitKilled(o)))}}}}triggerBaseOverrun(){var t;this.isOverrunFrenzy=!0,this.overrunTimer=3.2,xt.playExplosion();for(const e of this.units)e.active&&e.team==="red"&&(e.active=!1,Math.random()<.2&&this.spawnBurstParticles(e.x,.6,e.z,16722517,3));(t=this.onBanner)==null||t.call(this,"🔥 母巢破防！射速 ×300%","")}finishStage(t){var e,n;if(!this.isStageEnded)if(this.isStageEnded=!0,this.lastStageVictory=t,xt.setBgmDanger(0),t){this.victoryClimaxTimer=1.25,xt.playExplosion(),xt.playVictoryFanfare(),this.triggerContinuousQuake(1.25,1.55),this.triggerScreenFlash("#facc15",.92);for(const o of this.units)o.active&&(o.team==="red"?(o.active=!1,Math.random()<.45&&this.spawnBurstParticles(o.x,.8,o.z,16436245,6)):o.spawnHop=1.4);this.spawnSkyPillar(0,Mt,16436245,4.4,.78),this.spawnSkyPillar(-4.8,Mt+1.5,61695,2.8,.65),this.spawnSkyPillar(4.8,Mt+1.5,61695,2.8,.65),this.spawnSkyPillar(-2.6,Mt-1,14239471,2.4,.6),this.spawnSkyPillar(2.6,Mt-1,14239471,2.4,.6),this.spawnShockwave(0,Mt,16436245,17.5,.78),this.spawnShockwave(0,Mt,61695,13,.62),this.spawnShockwave(0,Mt,14239471,9.5,.5);const s=this.state.addGold(this.currentLevel.rewardGold);this.spawnBurstParticles(0,3,Mt-1,16436245,135),this.spawnBurstParticles(-3.5,2.2,Mt+.8,61695,75),this.spawnBurstParticles(3.5,2.2,Mt+.8,14239471,75),this.spawnFloatingPopup(0,3.6,Mt+1,`🏆 母巢崩塌! +${s} ⚡`,"#facc15"),(e=this.onBanner)==null||e.call(this,"🏆 母巢核心灰飞烟灭 · 战役大捷！",`🎉 通关赏金 +${s} ⚡ · 全军欢呼！`);const a=[{delay:.22,z:Mt+2.5,flash:"#00f0ff",col1:61695,col2:16436245},{delay:.48,z:-6,flash:"#facc15",col1:16436245,col2:14239471},{delay:.75,z:2,flash:"#d946ef",col1:14239471,col2:61695},{delay:1.02,z:9.5,flash:"#facc15",col1:16436245,col2:2278750}];a.forEach((o,r)=>{this.skillWaveQueue.push({delay:o.delay,exec:()=>{xt.playExplosion(),r===a.length-1&&xt.playVictoryFanfare(),this.addCameraShake(1.15),this.triggerScreenFlash(o.flash,.72);for(const l of[-5.8,-2.2,2.2,5.8]){const c=l<0?o.col1:o.col2;this.spawnSkyPillar(l,o.z+(Math.random()-.5)*1.5,c,2.6,.58),this.spawnShockwave(l,o.z,c,6.8,.52),this.spawnBurstParticles(l,1.8,o.z,c,42)}this.spawnShockwave(0,o.z,o.col1,15.5,.65)}})})}else(n=this.onStageEnd)==null||n.call(this,!1)}updateParticles(t){for(let e=0;e<pa;e++){const n=this.particles[e];if(n.active){if(n.life+=t,n.life>=n.maxLife){n.active=!1;continue}n.vy-=18*t,n.x+=n.vx*t,n.y+=n.vy*t,n.z+=n.vz*t,n.y<=.08&&n.vy<0&&(n.y=.08,n.vy=-n.vy*.48,n.vx*=.82,n.vz*=.82)}}for(let e=0;e<Fr;e++){const n=this.shockwaves[e];if(!n.active)continue;if(n.life+=t,n.life>=n.maxLife){n.active=!1,n.mesh.visible=!1;continue}const s=n.life/n.maxLife,a=jt.lerp(.3,n.maxRadius,1-Math.pow(1-s,2.2));n.mesh.scale.set(a,a,a),n.mat.opacity=(1-s)*.94}for(let e=0;e<Or;e++){const n=this.skyPillars[e];if(!n.active)continue;if(n.life+=t,n.life>=n.maxLife){n.active=!1,n.mesh.visible=!1;continue}const s=n.life/n.maxLife,a=s<.22?jt.lerp(n.maxRadius*.2,n.maxRadius,s/.22):jt.lerp(n.maxRadius,n.maxRadius*.08,(s-.22)/.78);n.mesh.scale.set(a,1,a),n.mat.opacity=Math.pow(1-s,1.3)*.92}for(const e of this.combatLights){if(!e.light.visible)continue;if(e.life+=t,e.life>=e.maxLife){e.light.visible=!1,e.light.intensity=0;continue}const n=e.life/e.maxLife;e.light.intensity=e.maxIntensity*Math.pow(1-n,1.45)}}projectToScreen(t,e,n){this.tempVec.set(t,e,n),this.tempVec.project(this.camera);const s=window.innerWidth/2,a=window.innerHeight/2;return{x:Math.round(this.tempVec.x*s+s),y:Math.round(-this.tempVec.y*a+a),visible:this.tempVec.z<1}}syncWorldLabels(){if((this.lowSpecMode||this.isMobileDevice)&&this.frameTickCounter&1)return;const t=76,e=window.innerHeight-98;for(const n of this.gears){if(!n.alive)continue;const s=this.projectToScreen(n.cfg.x,.88,n.cfg.z+n.cfg.radius*.56),a=s.visible&&s.y>=t&&s.y<=e;if(n.labelEl.style.display=a?"flex":"none",a){n.labelEl.style.left=`${s.x}px`,n.labelEl.style.top=`${s.y}px`;const o=`${n.hp}`;n.labelEl.textContent!==o&&(n.labelEl.textContent=o)}}for(const n of this.nests){if(!n.alive)continue;const s=this.projectToScreen(n.cfg.x,.75,n.cfg.z+1.55),a=s.visible&&s.y>=t&&s.y<=e;if(n.labelEl.style.display=a?"block":"none",a){n.labelEl.style.left=`${s.x}px`,n.labelEl.style.top=`${s.y}px`;const o=`${Math.ceil(n.hp)}`;n.labelEl.textContent!==o&&(n.labelEl.textContent=o)}}for(const n of this.barrels){if(!n.alive)continue;const s=this.projectToScreen(n.cfg.x,1.65,n.cfg.z),a=s.visible&&s.y>=t&&s.y<=e;if(n.labelEl.style.display=a?"flex":"none",a){n.labelEl.style.left=`${s.x}px`,n.labelEl.style.top=`${s.y}px`;const o=`${n.hp}`;n.labelEl.dataset.hp!==o&&(n.labelEl.dataset.hp=o,n.labelEl.innerHTML=`${Z.barrel}<span>${o}</span>`)}}if(!this.isMobileDevice)for(const n of this.zones){const s=n.cfg.type==="heal_sanctuary"?1.35:.45,a=this.projectToScreen(n.cfg.x,s,n.cfg.z),o=a.visible&&a.y>=t&&a.y<=e;n.labelEl.style.display=o?"block":"none",o&&(n.labelEl.style.left=`${a.x}px`,n.labelEl.style.top=`${a.y}px`)}if(this.lootBugLabelEl)if(this.lootBug.active){const n=this.projectToScreen(this.lootBug.x,1.9,this.lootBug.z),s=n.visible&&n.y>=t&&n.y<=e;if(this.lootBugLabelEl.style.display=s?"flex":"none",s){this.lootBugLabelEl.style.left=`${n.x}px`,this.lootBugLabelEl.style.top=`${n.y}px`;const a=`${this.lootBug.hp}`;this.lootBugLabelEl.dataset.hp!==a&&(this.lootBugLabelEl.dataset.hp=a,this.lootBugLabelEl.innerHTML=`${Z.lootbug}<span>${a}</span>`)}}else this.lootBugLabelEl.style.display="none";if(this.turretChargeEl&&this.turretChargeFillEl&&this.turretChargeTextEl){const n=this.projectToScreen(this.turretX,2.45,wt-1.25),s=Math.min(100,Math.floor(this.state.championCharge)),a=s>=100,o=this.isHoldingFireInput();if(n.visible&&!this.isPaused&&!this.isStageEnded&&(o||a)){const r=this.state.getMechaSpec(),l=window.innerWidth>768?132:110;this.turretChargeEl.style.display="flex",this.turretChargeEl.style.left=`${n.x}px`,this.turretChargeEl.style.top=`${Math.min(window.innerHeight-l,Math.max(82,n.y))}px`,this.turretChargeEl.classList.toggle("is-holding",o),this.turretChargeEl.classList.toggle("is-full",a),this.turretChargeFillEl.style.width=`${s}%`;const c=`${r.id}_${a?1:0}_${o?1:0}_${s}`;this.turretChargeTextEl.dataset.stateKey!==c&&(this.turretChargeTextEl.dataset.stateKey=c,this.turretChargeTextEl.innerHTML=a?o?`${r.icon} 满能 · 松手召唤!`:`${r.icon} 满能 · 空格/点击召唤`:`${Z.bolt} 蓄能 ${s}%`)}else this.turretChargeEl.style.display="none"}}renderScene(){var f;let t=0,e=0,n=0,s=0,a=0,o=0,r=0;const l=this.state.getGiantTrooperSpec(),c=this.state.getSwarmTrooperSpec(),d=this.state.getUltimateEvolutionSpec();this.dummy.rotation.order="YXZ";for(let m=0;m<Qe;m++){const p=this.units[m];if(!p.active)continue;const S=Math.hypot(p.vx,p.vz),g=jt.clamp(S/Math.max(1,p.speed),.15,1.35),h=p.spawnHop>.68,b=Math.min(1,p.spawnHop/(h?2.15:.68)),w=Math.sin(b*Math.PI)*(h?3.05:.72),y=.14*g+p.attackAnim*.22,C=jt.clamp(-p.turnRate*.22,-.28,.28),v=Math.max(.35,p.radius*2.55*(1-Math.min(.45,w*.14)));if(this.dummy.position.set(p.x,.026,p.z+.08),this.dummy.rotation.set(0,0,0),this.dummy.scale.set(v,1,v*.82),this.dummy.updateMatrix(),this.unitShadowInst.setMatrixAt(r++,this.dummy.matrix),p.team==="blue")if(p.kind==="champion"&&e<120){const T=d.mechaScaleMult*(1+this.state.getSkillNodeRank("titan_t1")*.08+this.state.getSkillNodeRank("titan_t3")*.06),P=Math.sin(p.walkPhase*.45)*.14-jt.clamp(p.vx*.04,-.32,.32);this.dummy.position.set(p.x,w,p.z),this.dummy.rotation.set(y*.35,P,C*.5),this.dummy.scale.set(T,T,T),this.dummy.updateMatrix(),this.championInst.setMatrixAt(e,this.dummy.matrix);const x=e*4;this.champAnimData[x]=p.walkPhase,this.champAnimData[x+1]=g,this.champAnimData[x+2]=p.attackAnim,this.champAnimData[x+3]=p.mechaType==="pyro"?.35:.15,e++}else{const T=this.currentTurretEvoTier===2?1.16:this.currentTurretEvoTier===1?1.08:1,P=p.fusionTier||0,M=(P>=1?l.baseScale*(1+(P-1)*.34):p.isMiniGiant?1.85:(p.kind==="charged"?1.18:1+p.spawnHop*.12)*c.scaleMult)*T,_=Math.sin(p.walkPhase*.5)*.16-jt.clamp(p.vx*.045,-.35,.35),N=C+Math.sin(p.walkPhase)*.08;this.dummy.position.set(p.x,w,p.z),this.dummy.rotation.set(y*.35,_,N),this.dummy.scale.set(M,M,M),this.dummy.updateMatrix(),this.blueBodyInst.setMatrixAt(t,this.dummy.matrix);const U=P>=3?this.candyAmber:P>=2||p.kind==="charged"?this.candyGold:this.skinCandyTints[p.id%3];this.blueBodyInst.setColorAt(t,U);const H=t*4;this.blueAnimData[H]=p.walkPhase,this.blueAnimData[H+1]=g,this.blueAnimData[H+2]=p.attackAnim,this.blueAnimData[H+3]=P>=2?.36:P===1||p.isMiniGiant||p.kind==="charged"?.22:0,t++}else if(p.kind==="brute"&&s<120){this.dummy.position.set(p.x,w,p.z),this.dummy.rotation.set(y*.7,p.yaw,C*.5),this.dummy.scale.set(1,1,1),this.dummy.updateMatrix(),this.bruteInst.setMatrixAt(s,this.dummy.matrix);const T=s*4;this.bruteAnimData[T]=p.walkPhase,this.bruteAnimData[T+1]=g,this.bruteAnimData[T+2]=p.attackAnim,this.bruteAnimData[T+3]=0,s++}else if(p.kind==="baneling"&&a<180){const T=1+Math.sin(this.elapsedTime*12+p.id)*.08;this.dummy.position.set(p.x,w,p.z),this.dummy.rotation.set(y*1.1,p.yaw,C),this.dummy.scale.set(T,T,T),this.dummy.updateMatrix(),this.banelingInst.setMatrixAt(a,this.dummy.matrix);const P=a*4;this.banelingAnimData[P]=p.walkPhase,this.banelingAnimData[P+1]=g,this.banelingAnimData[P+2]=p.attackAnim,this.banelingAnimData[P+3]=.25,a++}else if(p.kind==="shaman"&&o<120){this.dummy.position.set(p.x,w,p.z),this.dummy.rotation.set(y*.6,p.yaw,C*.5),this.dummy.scale.set(1.12,1.12,1.12),this.dummy.updateMatrix(),this.shamanInst.setMatrixAt(o,this.dummy.matrix);const T=o*4;this.shamanAnimData[T]=p.walkPhase,this.shamanAnimData[T+1]=g,this.shamanAnimData[T+2]=p.attackAnim,this.shamanAnimData[T+3]=.15,o++}else{this.dummy.position.set(p.x,w,p.z),this.dummy.rotation.set(y,p.yaw,C),this.dummy.scale.set(1,1,1),this.dummy.updateMatrix(),this.redBodyInst.setMatrixAt(n,this.dummy.matrix);const T=n*4;this.redAnimData[T]=p.walkPhase,this.redAnimData[T+1]=g,this.redAnimData[T+2]=p.attackAnim,this.redAnimData[T+3]=0,n++}}this.blueBodyInst.count=t,this.championInst.count=e,this.redBodyInst.count=n,this.bruteInst.count=s,this.banelingInst.count=a,this.shamanInst.count=o,this.unitShadowInst.count=r,this.blueBodyInst.instanceMatrix.needsUpdate=!0,this.blueBodyInst.instanceColor&&(this.blueBodyInst.instanceColor.needsUpdate=!0),this.championInst.instanceMatrix.needsUpdate=!0,this.redBodyInst.instanceMatrix.needsUpdate=!0,this.bruteInst.instanceMatrix.needsUpdate=!0,this.banelingInst.instanceMatrix.needsUpdate=!0,this.shamanInst.instanceMatrix.needsUpdate=!0,this.unitShadowInst.instanceMatrix.needsUpdate=!0,this.blueAnimAttr.needsUpdate=!0,this.champAnimAttr.needsUpdate=!0,this.redAnimAttr.needsUpdate=!0,this.bruteAnimAttr.needsUpdate=!0,this.banelingAnimAttr.needsUpdate=!0,this.shamanAnimAttr.needsUpdate=!0;let u=0;for(let m=0;m<pa;m++){const p=this.particles[m];if(!p.active)continue;const S=p.scale*(1-p.life/p.maxLife);this.dummy.position.set(p.x,p.y,p.z),this.dummy.rotation.set(p.life*6,p.life*4,0),this.dummy.scale.set(S,S,S),this.dummy.updateMatrix(),this.particleInst.setMatrixAt(u,this.dummy.matrix),this.particleInst.setColorAt(u,p.color),u++}if(this.particleInst.count=u,this.particleInst.instanceMatrix.needsUpdate=!0,this.particleInst.instanceColor&&(this.particleInst.instanceColor.needsUpdate=!0),this.cameraShake>.001){const m=this.cameraShake*this.cameraShake*1.18,p=this.quakeTimer>0?Math.sin(this.elapsedTime*58)*m*.42:0,S=this.quakeTimer>0?Math.cos(this.elapsedTime*67)*m*.35:0;this.camera.position.set(this.baseCameraPos.x+(Math.random()-.5)*m+p,this.baseCameraPos.y+(Math.random()-.5)*m*.8+S,this.baseCameraPos.z+(Math.random()-.5)*m)}else this.camera.position.copy(this.baseCameraPos);if(this.frameTickCounter++,this.frameTickCounter&3||(this.renderer.shadowMap.needsUpdate=!0),this.usePostProcessing&&!this.isMobileDevice){if((f=this.cinemaPass)!=null&&f.uniforms){this.cinemaPass.uniforms.uAberration.value=Math.min(1,this.cameraShake*.85);const m=this.playerBaseMaxHp>0?this.playerBaseHp/this.playerBaseMaxHp:1,p=!this.isPaused&&!this.isStageEnded&&m<.42?(.5+.5*Math.sin(this.elapsedTime*8))*(1-m/.42):0,S=!this.isPaused&&!this.isStageEnded&&this.bossBerserkTriggered?.25+.15*Math.sin(this.elapsedTime*5):0;this.cinemaPass.uniforms.uDangerPulse.value=Math.max(p,S)}this.composer.render()}else this.renderer.render(this.scene,this.camera)}}const X=new Ux,cf=document.getElementById("game-canvas"),Zo=document.getElementById("world-labels"),Xs=document.querySelector(".hud-top"),qs=document.querySelector(".hud-bottom"),Ks=document.getElementById("stage-badge"),t2=document.getElementById("blue-count"),e2=document.getElementById("red-count"),n2=document.getElementById("gold-amount"),i2=document.getElementById("boss-name"),s2=document.getElementById("boss-hp-text"),a2=document.getElementById("boss-bar-fill"),o2=document.getElementById("player-hp-text"),r2=document.getElementById("player-bar-fill"),Hr=document.getElementById("active-buffs-bar"),Fa=document.getElementById("center-banner"),l2=document.getElementById("banner-title"),ld=document.getElementById("banner-sub"),cd=document.getElementById("btn-top-menu"),De=document.getElementById("top-tools-drawer"),hd=document.getElementById("btn-resume-drawer"),Xl=document.getElementById("btn-home"),hf=document.getElementById("btn-reroll-map"),df=document.getElementById("btn-theme"),ql=document.getElementById("btn-camera"),wc=document.getElementById("btn-sound"),uf=document.getElementById("btn-restart"),Vn=document.getElementById("title-screen"),ji=document.getElementById("btn-title-sound"),dd=document.getElementById("title-welcome-text"),Gr=document.getElementById("title-loader-box"),Mo=document.getElementById("title-loader-fill"),yo=document.getElementById("title-loader-label"),Ji=document.getElementById("btn-enter-workshop"),ud=document.getElementById("btn-back-to-title");let Oa=!0,xa=!1;const cs=document.getElementById("main-menu"),c2=document.getElementById("menu-gold-amount"),h2=document.getElementById("menu-star-amount"),fd=document.getElementById("btn-header-stars"),pd=document.getElementById("btn-header-gold"),md=document.getElementById("btn-commander-profile"),gd=document.getElementById("commander-rank-tag"),vd=document.getElementById("commander-name-text"),xd=document.getElementById("commander-best-stage"),_d=document.getElementById("brand-crest-img"),d2=document.getElementById("badge-tab-skills"),u2=document.getElementById("badge-tab-meta"),f2=document.getElementById("badge-tab-skins"),So=document.getElementById("home-hero-stage"),Us=document.getElementById("btn-home-theme"),Md=document.getElementById("home-theme-label"),Vr=document.getElementById("btn-home-mecha"),yd=document.getElementById("home-mecha-icon"),Sd=document.getElementById("home-mecha-label"),bd=document.getElementById("btn-home-prev-race"),wd=document.getElementById("btn-home-next-race"),Td=document.getElementById("btn-home-pedestal"),Kl=document.getElementById("home-mascot-art"),Ed=document.getElementById("home-race-title"),Cd=document.getElementById("home-race-pts-tag"),Ad=document.getElementById("home-race-perk"),Rd=document.getElementById("launch-btn-sub"),Aa=document.getElementById("menu-equipped-skin"),Pd=document.getElementById("menu-stat-power"),kd=document.getElementById("menu-stat-firerate"),Id=document.getElementById("menu-stat-bastion"),Ld=document.getElementById("menu-stat-bounty"),Ra=document.getElementById("meta-upgrades-grid"),Zi=document.getElementById("skins-shop-grid"),Yl=document.getElementById("btn-start-battle"),Zl=document.getElementById("btn-modal-home"),si=document.getElementById("leaderboard-list"),Dd=document.getElementById("leaderboard-self-status"),Fn=document.getElementById("btn-lb-peak"),On=document.getElementById("btn-lb-active"),Ri=document.getElementById("btn-edit-name"),Pi=document.getElementById("btn-share-game");let ki="peak";const No=document.getElementById("menu-active-keystone-pill"),Bd=document.getElementById("skill-available-points"),Nd=document.getElementById("skill-active-keystone"),$n=document.getElementById("btn-buy-talent"),oi=document.getElementById("btn-reset-skills"),Pa=document.getElementById("btn-toggle-tree-zoom"),$r=document.querySelector(".main-menu-card"),Wr=document.getElementById("skill-tree-viewport"),Ls=document.getElementById("skill-tree-canvas"),bo=document.getElementById("skill-inspector-bar"),Ys=document.getElementById("update-notice-card"),Ud=document.getElementById("btn-toggle-notice");let ff=!1;Ys&&Ys.classList.add("is-collapsed");Ud&&Ys&&Ud.addEventListener("click",()=>{ff=!0,Ys.classList.toggle("is-collapsed"),xt.playUpgrade()});window.addEventListener("resize",()=>{!Ys||ff||Ys.classList.add("is-collapsed")});const ma=new WeakMap;function zd(i,t){if(!i)return;const e=Math.floor(t),n=ma.get(i),s=n?n.current:e;if(n&&n.rafId&&cancelAnimationFrame(n.rafId),s===e){i.textContent=e.toLocaleString(),ma.set(i,{current:e,rafId:0});return}const a=performance.now(),o=320;i.classList.remove("num-roll-pulse"),i.offsetWidth,i.classList.add("num-roll-pulse");const r=c=>{const d=Math.min(1,(c-a)/o),u=1-Math.pow(1-d,3),f=Math.round(s+(e-s)*u);if(i.textContent=f.toLocaleString(),d<1){const m=requestAnimationFrame(r);ma.set(i,{current:f,rafId:m})}else i.textContent=e.toLocaleString(),ma.set(i,{current:e,rafId:0})},l=requestAnimationFrame(r);ma.set(i,{current:s,rafId:l})}function Xn(i,t,e="#f59e0b"){if(!i)return;const n=i.getBoundingClientRect(),s=n.left+n.width*.5,a=n.top+n.height*.42,o=document.createElement("div");o.className="ui-upgrade-burst-container",o.style.left=`${s}px`,o.style.top=`${a}px`,o.style.setProperty("--burst-color",e);const r=document.createElement("span");r.className="ui-burst-ring",o.appendChild(r);for(let c=0;c<6;c++){const d=document.createElement("span");d.className="ui-burst-spark";const u=c/6*Math.PI*2-Math.PI*.5,f=34+c%2*14;d.style.setProperty("--tx",`${Math.round(Math.cos(u)*f)}px`),d.style.setProperty("--ty",`${Math.round(Math.sin(u)*f)}px`),o.appendChild(d)}const l=document.createElement("div");l.className="ui-burst-badge",l.innerHTML=`${Z.sparkle} <span>${t}</span>`,o.appendChild(l),document.body.appendChild(o),window.setTimeout(()=>{o.remove()},850)}let nn="swarm_t1",Xr=!1,Cn=0,fn=0,un=!1;const Qi=document.getElementById("btn-champion"),p2=document.getElementById("champion-fill"),m2=document.getElementById("champion-pct"),Fd=document.getElementById("champion-icon"),Od=document.getElementById("champion-name"),Hd=document.getElementById("champion-desc"),pf=document.getElementById("btn-mecha-mode"),Gd=document.getElementById("mecha-mode-icon"),Vd=document.getElementById("mecha-mode-label"),zs=document.getElementById("btn-orbital"),g2=document.getElementById("orbital-fill"),$d=document.getElementById("orbital-name"),v2=document.getElementById("orbital-pct"),Uo=document.getElementById("upg-firerate"),x2=document.getElementById("lvl-firerate"),Wd=document.getElementById("stat-firerate"),_2=document.getElementById("cost-firerate"),zo=document.getElementById("upg-power"),M2=document.getElementById("lvl-power"),Xd=document.getElementById("stat-power"),y2=document.getElementById("cost-power"),Fo=document.getElementById("upg-champion"),S2=document.getElementById("lvl-champion"),qd=document.getElementById("stat-champion"),b2=document.getElementById("cost-champion"),Oo=document.getElementById("upg-loot"),w2=document.getElementById("lvl-loot"),Kd=document.getElementById("stat-loot"),T2=document.getElementById("cost-loot"),as=document.getElementById("result-modal"),Yd=document.getElementById("modal-badge"),Zd=document.getElementById("modal-title"),jd=document.getElementById("modal-desc"),E2=document.getElementById("stat-total-spawned"),C2=document.getElementById("stat-total-kills"),A2=document.getElementById("stat-stage-gold"),Ga=document.getElementById("reward-section"),Jd=document.getElementById("speed-skip-banner"),Qd=document.getElementById("speed-skip-text"),Ii=document.getElementById("btn-toggle-speed-skip"),jl=document.getElementById("reward-prompt-text"),tu=document.getElementById("reward-gold-balance"),Li=document.getElementById("btn-reroll-rewards"),Jl=document.getElementById("reward-cards"),Ql=document.getElementById("penalty-section"),R2=document.getElementById("penalty-list"),ts=document.getElementById("btn-cleanse-debuff"),tc=document.getElementById("btn-modal-replay"),ri=document.getElementById("btn-modal-share"),Wn=document.getElementById("btn-modal-next"),wo=document.getElementById("global-toast"),Bt=new Qx(cf,Zo,X);let qr;function Ho(i){wo&&(wo.innerHTML=Do(i),wo.classList.remove("hidden"),qr&&window.clearTimeout(qr),qr=window.setTimeout(()=>{wo.classList.add("hidden")},2600))}async function P2(i){try{if(navigator.clipboard&&navigator.clipboard.writeText)return await navigator.clipboard.writeText(i),!0}catch{}try{const t=document.createElement("textarea");return t.value=i,t.style.position="fixed",t.style.opacity="0",document.body.appendChild(t),t.select(),document.execCommand("copy"),document.body.removeChild(t),!0}catch{return!1}}async function mf(i,t){const e=X.buildShareChallengeText(i,t);await P2(e.text);const n=X.claimDailyShareBonus();xt.playUpgrade(),Ne(),na(),me(),n.claimed?Ho(`🎁 已复制挑战链接！今日首享 +${n.goldAwarded.toLocaleString()}🪙 & +${n.shardsAwarded}【${n.skinName}】碎片`):Ho("✅ 战报与邀请链接已复制，快发给好友比拼吧！")}function Tc(i){if(!De)return;De.classList.toggle("hidden",!i),cs.classList.contains("hidden")&&as.classList.contains("hidden")&&(Bt.isPaused=i)}cd&&cd.addEventListener("click",i=>{i.stopPropagation();const t=!!(De!=null&&De.classList.contains("hidden"));xt.playUpgrade(),Tc(t)});hd&&hd.addEventListener("click",()=>{xt.playUpgrade(),Tc(!1)});cf.addEventListener("pointerdown",()=>{De&&!De.classList.contains("hidden")&&Tc(!1)});let Kr;function fi(i,t=""){cs.classList.contains("hidden")&&(l2.innerHTML=Do(i),ld.innerHTML=t?Do(t):"",ld.style.display=t?"block":"none",Fa.classList.remove("hidden"),Kr&&window.clearTimeout(Kr),Kr=window.setTimeout(()=>{Fa.classList.add("hidden")},1600))}Bt.onBanner=fi;let an=[],Ln=!1,ln=-1,Ec=0,Rn=!1,qn=!1;function gf(){return 100*Math.pow(2,Ec)}function Va(){return Rn&&qn?3:1}function Bi(){const i=X.getMechaSpec(),t=X.getCommittedSkillBranch(),e=X.getUltimateEvolutionSpec();Gd&&(Gd.innerHTML=i.icon),Vd&&(Vd.textContent=i.shortName),Fd&&(Fd.innerHTML=i.icon);const n=t?t.hammerMorphName:i.name;Od&&(Od.innerHTML=e.isCompleteForm?`${Z.crown}<span>${n}</span>`:n),Hd&&(Hd.textContent=`[${e.badge}] ${t?t.hammerMorphDesc:i.desc}`),Qi&&(Qi.classList.toggle("ult-complete-form",e.isCompleteForm),Qi.title=t?`【${t.hammerMorphName} · ${e.badge}】(${t.name}联动·当前姿态：${i.name}·空格键)：${t.hammerMorphDesc}`:`召唤${i.name}【${e.badge}】（空格键）：${i.desc}`);const s=t?t.orbitalMorphName:"全屏礼花";$d&&($d.innerHTML=e.isCompleteForm?`${Z.crown}<span>${s}</span>`:s),zs&&(zs.classList.toggle("ult-complete-form",e.isCompleteForm),zs.title=t?`【${t.orbitalMorphName} · ${e.badge}】(${t.name}联动·Q键)：${t.orbitalMorphDesc}`:`全屏礼花【${e.badge}】（Q键）：礼花轰炸范围与波次随技能树与大招等级进化`)}function k2(i){return i>=35?"传奇波波制作人":i>=20?"皇家蒸汽总督":i>=10?"王牌应援督军":i>=5?"资深舞台领队":i>=1?"正式应援团长":"新星应援制作人"}function I2(){const i=Mn.filter(s=>X.canUpgradeSkillNode(s.id).ok).length,t=za.filter(s=>X.getMetaLevel(s.id)<s.maxLevel&&X.gold>=X.getMetaUpgradeCost(s.id)).length,e=Un.filter(s=>X.ownedSkins.includes(s.id)?X.canAscendSkin(s.id).ok:X.gold>=s.cost).length,n=(s,a)=>{s&&(a>0?(s.textContent=`${a}`,s.classList.remove("hidden")):s.classList.add("hidden"))};n(d2,i),n(u2,t),n(f2,e)}function me(){var l;const i=Math.floor(X.gold);zd(c2,i),zd(h2,X.getAvailableTalentPoints()),I2();const t=X.getEquippedSkin(),e=X.getSkinRankSpec(t.id);Aa&&(Aa.innerHTML=`${Z.sparkle} <span>${t.name} · ${e.tier}阶</span>`,Aa.style.background=t.previewGradient);const n=X.getActiveKeystoneSpec(),s=X.getCommittedSkillBranch(),a=X.getActiveRaceBranch(),o=X.getMechaSpec(),r=X.getSpentTalentPoints();if(_d&&(_d.src=`/assets/icons/race_${a.id}.png?v=15`),gd&&(gd.textContent=k2(X.bestStageCleared)),vd&&(vd.textContent=X.playerName),xd&&(xd.innerHTML=`${Z.trophy} <span>最高 ${X.bestStageCleared} 关</span>`),So&&(So.style.setProperty("--hero-race-color",a.accentColor),So.dataset.theme=((l=Bt.currentTheme)==null?void 0:l.id)||"wasteland",So.dataset.race=a.id),Md&&Bt.currentTheme&&(Md.textContent=Bt.currentTheme.badge),yd&&(yd.innerHTML=o.icon),Sd&&(Sd.textContent=s?s.hammerMorphName:o.shortName),Kl&&(Kl.innerHTML=a.icon),Ed&&(Ed.innerHTML=`${n?`${Z.crown} `:""}${a.raceName} · ${a.unitName}`),Cd&&(Cd.innerHTML=`${Z.star} ${r}/16`),Ad&&(Ad.textContent=n?`终极觉醒：${n.node.name} — ${n.node.desc}`:`${a.subtitle} · 大招【${a.hammerMorphName}】`),Rd&&Bt.currentTheme&&(Rd.textContent=`第 1 关起航 · ${Bt.currentTheme.name} · ${a.raceName}出阵`),No){const c=n?`${n.branch.icon} ${Z.crown} ${n.branch.raceName}·${n.node.name}`:s?`${s.icon} ${s.raceName}·${s.unitName} (${r}/16)`:`${a.icon} ${a.raceName}·${a.unitName} (可切族)`,d=n?`${n.branch.icon}${Z.crown} ${n.branch.raceName}`:`${a.icon} ${a.raceName} (${r}/16)`;No.innerHTML=`<span class="desktop-only-text">${c}</span><span class="mobile-only-text">${d}</span><kbd class="kbd-hint">G</kbd>`}if(Go(),Pd&&(Pd.textContent=`×${X.getPowerMultiplier().toFixed(2)}`),kd&&(kd.textContent=`${X.getFireRatePerSec().toFixed(1)}/s`),Id){const c=Math.round((X.getBaseHpMultiplier()-1)*100);Id.textContent=`${c>=0?"+":""}${c}%`}if(Ld){const c=Math.round((X.getLootMultiplier()-1)*100);Ld.textContent=`+${c}%`}if(Ra&&(Ra.innerHTML="",za.forEach((c,d)=>{const u=X.getMetaLevel(c.id),f=u>=c.maxLevel,m=X.getMetaUpgradeCost(c.id),p=!f&&X.gold>=m,S=c.statPerLevelText(u),g=S.replace("当前 ","").replace("每级","").replace(")","/级)"),h=Math.min(100,Math.round(u/Math.max(1,c.maxLevel)*100)),b=document.createElement("div");b.className=`meta-card ${f?"is-max":""} ${un&&d===Cn?"kbd-focused":""}`,b.style.setProperty("--stagger-i",`${d}`),b.innerHTML=`
        <div class="meta-card-top">
          <div class="meta-portrait-well">
            <span class="meta-lvl">Lv.${u}</span>
            <span class="meta-icon">${c.icon}</span>
          </div>
          <div class="meta-info">
            <div class="meta-title-row">
              <strong>${c.name}</strong>
            </div>
            <div class="meta-desc">${c.desc}</div>
            <div class="meta-progress-track" title="等级进度 ${u} / ${c.maxLevel}">
              <div class="meta-progress-fill" style="width: ${h}%"></div>
              <span class="meta-progress-text">${u} / ${c.maxLevel}</span>
            </div>
            <div class="meta-cur">
              <span class="desktop-only-text">${S}</span>
              <span class="mobile-only-text">${g}</span>
            </div>
          </div>
        </div>
        <button type="button" class="meta-buy-btn" ${p?"":"disabled"}>
          ${f?`${Z.check} MAX 满级`:`${Z.coin} ${m.toLocaleString()}<span class="desktop-only-text"> 升级</span><kbd class="kbd-hint">${d+1}</kbd>`}
        </button>
      `;const w=b.querySelector(".meta-buy-btn");w.addEventListener("click",()=>{Cn=d,X.buyMetaUpgrade(c.id)&&(xt.playUpgrade(),Xn(w,`${c.name} Lv.${X.getMetaLevel(c.id)}!`,"#48ad29"),Ne(),me())}),Ra.appendChild(b)})),Zi&&(Zi.innerHTML="",Un.forEach((c,d)=>{const u=X.ownedSkins.includes(c.id),f=X.equippedSkin===c.id,m=u||X.gold>=c.cost,p=X.canAscendSkin(c.id),S=p.currentRank,g=p.nextRank,h=p.isMaxRank?100:Math.min(100,Math.round(p.currentShards/Math.max(1,p.requiredShards)*100)),b=u?g?`${c.statLabel} ${c.statValueAtRank(S.index)} → ${c.statValueAtRank(g.index)}`:`${Z.crown} ${c.statLabel} ${c.statValueAtRank(S.index)} (满阶)`:`${c.statLabel} ${c.statValueAtRank(0)} ~ ${c.statValueAtRank(5)}`,w=u?`
          <div class="skin-shard-box">
            <div class="skin-shard-row">
              <span style="color: ${p.isMaxRank||p.hasEnoughShards?"#2e8b22":"#78583a"}">
                ${Z.shard} ${p.isMaxRank?`余 ${p.currentShards}`:`${p.currentShards}/${p.requiredShards}`}
              </span>
              <strong style="color: ${p.isMaxRank?"#9a3412":p.hasEnoughGold?"#b4690e":"#c8372d"}">
                ${p.isMaxRank?`${Z.crown} SSS满阶`:`${Z.coin} ${p.requiredGold.toLocaleString()}`}
              </strong>
            </div>
            <div class="skin-shard-track">
              <div class="skin-shard-fill" style="width: ${h}%; background: ${c.previewGradient}"></div>
            </div>
          </div>
        `:"",y=c.cost>=1e3?`${(c.cost/1e3).toFixed(1).replace(/\.0$/,"")}k`:`${c.cost}`,C=u&&!p.isMaxRank?`<button type="button" class="skin-ascend-btn ${p.ok?"ready":""}" ${p.ok?"":"disabled"}>
              ${Z.arrowUp} <span class="desktop-only-text">升 </span>${g==null?void 0:g.tier}阶<kbd class="kbd-hint">U</kbd>
            </button>`:"",v=document.createElement("div");v.className=`skin-card ${f?"equipped":""} ${u?"owned":""} ${un&&d===fn?"kbd-focused":""}`,v.style.setProperty("--stagger-i",`${d}`),v.title=c.desc;const T=Bx[c.id]||"";v.innerHTML=`
        <div class="skin-swatch" style="background: ${c.previewGradient}">
          <span class="skin-tag" style="color: ${c.badgeColor}">${c.tag}</span>
          <div class="skin-art-portrait">${T}</div>
          <span class="skin-rank-badge" style="color: ${S.color}; background: ${S.bg}">
            ${u?`${S.tier} 阶`:"未解锁"}
          </span>
        </div>
        <div class="skin-body">
          <div class="skin-title">${c.name}</div>
          <div class="skin-bonus">${b}</div>
          ${w}
        </div>
        <div class="skin-actions-row">
          <button type="button" class="skin-action-btn ${f?"btn-equipped":u?"btn-equip":"btn-buy"}" ${!m&&!u?"disabled":""}>
            ${f?`${Z.check} <span class="desktop-only-text">已</span>穿戴<kbd class="kbd-hint">${d+1}</kbd>`:u?`穿戴<kbd class="kbd-hint">${d+1}</kbd>`:`<span class="desktop-only-text">${Z.coin} ${c.cost.toLocaleString()} 解锁</span><span class="mobile-only-text">${Z.coin} ${y}</span><kbd class="kbd-hint">${d+1}</kbd>`}
          </button>
          ${C}
        </div>
      `;const P=v.querySelector(".skin-action-btn");P.addEventListener("click",()=>{fn=d;const M=X.buyOrEquipSkin(c.id);(M==="bought"||M==="equipped")&&(xt.playUpgrade(),Xn(P,M==="bought"?`解锁【${c.name}】!`:`已穿戴【${c.name}】`,c.badgeColor),Bt.applySkin(X.getEquippedSkin()),Ne(),me())});const x=v.querySelector(".skin-ascend-btn");x&&x.addEventListener("click",()=>{if(fn=d,X.ascendSkin(c.id)){xt.playVictoryFanfare();const M=X.getSkinRankSpec(c.id);Xn(x,`${c.name} 升至 ${M.tier} 阶!`,"#f59e0b"),Ne(),me(),fi(`✨ 【${c.name}】升至 ${M.tier} 阶！`,c.bonusTextAtRank(M.index))}}),Zi.appendChild(v)})),Fn&&Fn.classList.toggle("active",ki==="peak"),On&&On.classList.toggle("active",ki==="active"),Pi){const c=X.canClaimDailyShareBonus();Pi.innerHTML=`${c?`${Z.gift} 分享+3000${Z.coin}`:`${Z.share} 分享`}<kbd class="kbd-hint">F</kbd>`,Pi.classList.toggle("has-bonus",c)}if(si){const c=ki==="active",{top10:d,selfRank:u}=c?X.getTop10ActiveLeaderboard():X.getTop10Leaderboard();if(Dd){const f=u&&u<=10?`#${u}`:"未上榜";Dd.innerHTML=c?`<span class="desktop-only-text">${X.playerName} · 游戏时间 </span>${X.formatPlayTime(X.playTimeSeconds)} (${f})`:`<span class="desktop-only-text">${X.playerName} · </span>最高 ${X.bestStageCleared} 关 (${f})`}si.innerHTML="",d.forEach((f,m)=>{const p=m+1,S=p===1?Z.medal1:p===2?Z.medal2:p===3?Z.medal3:`${p}`,g=f.isBot?'<span class="lb-role-tag lb-role-bot" title="预设守门AI基准线，有真人玩家上榜时自动腾出名额">AI</span>':'<span class="lb-role-tag lb-role-real" title="真实玩家云端战绩">真人</span>',h=document.createElement("div");h.className=`lb-row ${c?"lb-active-mode":""} ${p<=3?`lb-top-${p}`:""} ${f.isSelf?"lb-self-row":""}`,h.style.setProperty("--stagger-i",`${m}`);const b=["swarm","titan","gate","plasma","orbital","bastion","tycoon"],y=`<div class="lb-avatar-box"><img class="art-icon-img lb-avatar-img" src="/assets/icons/race_${b[m%b.length]}.png?v=15" alt="" draggable="false" /></div>`;if(c){const C=X.formatPlayTime(f.playTimeSeconds);h.innerHTML=`
          <span class="lb-rank">${S}</span>
          ${y}
          <div class="lb-player">
            <span class="lb-name">${f.name}${f.isSelf?" (我)":""}</span>
            ${g}
            <span class="lb-skin" style="color: ${f.badgeColor}">${f.skinName}</span>
          </div>
          <span class="lb-kills">${Z.trophy} ${f.bestStage} 关</span>
          <strong class="lb-time">${Z.clock} ${C}</strong>
        `}else h.innerHTML=`
          <span class="lb-rank">${S}</span>
          ${y}
          <div class="lb-player">
            <span class="lb-name">${f.name}${f.isSelf?" (我)":""}</span>
            ${g}
            <span class="lb-skin" style="color: ${f.badgeColor}">${f.skinName}</span>
          </div>
          <span class="lb-kills">${Z.trophy} ${f.totalKills.toLocaleString()}</span>
          <strong class="lb-stage">${f.bestStage} 关</strong>
        `;si.appendChild(h)})}}const L2={swarm:[{x:10.5,y:74},{x:8.6,y:56.5},{x:7.8,y:38.8},{x:7.6,y:20.8}],titan:[{x:24.2,y:72.5},{x:22,y:54.8},{x:21.4,y:37},{x:21.4,y:19}],orbital:[{x:37.2,y:71.2},{x:36,y:53.2},{x:35.7,y:35.4},{x:35.7,y:17.4}],gate:[{x:50,y:70.2},{x:50,y:52.2},{x:50,y:34.2},{x:50,y:16.2}],plasma:[{x:62.8,y:71.2},{x:64,y:53.2},{x:64.3,y:35.4},{x:64.3,y:17.4}],bastion:[{x:75.8,y:72.5},{x:78,y:54.8},{x:78.6,y:37},{x:78.6,y:19}],tycoon:[{x:89.5,y:74},{x:91.4,y:56.5},{x:92.2,y:38.8},{x:92.4,y:20.8}]};function eu(){if(!bo)return;const i=Mn.find(d=>d.id===nn)||Mn[0],t=Re.find(d=>d.id===i.branchId)||Re[0],e=X.getSkillNodeRank(i.id),n=e>=i.maxRank,s=X.canUpgradeSkillNode(i.id),a=xe[i.id]||"",o=e===0?i.statText(1):n?i.statText(e):`${i.statText(e)} → Lv.${e+1}: ${i.statText(e+1)}`,r=s.goldCost>=1e3?`${(s.goldCost/1e3).toFixed(1).replace(/\.0$/,"")}k`:`${s.goldCost}`;let l=`${Z.check} 已满级`;n||(s.ok?l=`${Z.arrowUp} 升级 (${i.pointCost}${Z.star} + ${r}${Z.coin})`:s.reqMatches?l=`${Z.lock} 需累计 ${s.reqMatches} 局`:s.reason.includes("先点满")?l=`${Z.lock} 需先点满下层天赋`:s.reason.includes("已锁")?l=`${Z.lock} 已专精其他种族 (可洗点)`:s.reason.includes("天赋点不足")?l=`${Z.lock} 需 ${i.pointCost} ${Z.star} 天赋星`:s.reason.includes("点数不足")?l=`${Z.lock} 需 ${r} ${Z.coin} 金币`:l=`${Z.lock} ${s.reason}`),bo.style.setProperty("--inspector-color",t.accentColor),bo.style.setProperty("--branch-color",t.accentColor),bo.innerHTML=`
    <div class="kr-parchment-sheet">
      <div class="kr-parchment-top">
        <div class="sib-icon-box ${e>0?"is-unlocked":""}" style="--branch-color: ${t.accentColor}">
          ${a}
          ${n?`<span class="kr-check-badge">${Z.check}</span>`:""}
        </div>
        <div class="kr-parchment-head-meta">
          <div class="kr-cost-star-tag" title="每级消耗天赋星数">
            ${Z.star}
            <strong>${i.pointCost}</strong>
          </div>
          <span class="sib-tier-tag ${i.isKeystone?"is-keystone":""}">
            ${i.isKeystone?`${Z.crown} 终极`:`T${i.tier}`} · Lv.${e}/${i.maxRank}
          </span>
        </div>
      </div>

      <div class="kr-parchment-body">
        <div class="kr-title-line">
          <strong class="sib-name">${i.name}</strong>
          <span class="sib-branch-tag" style="color: ${t.accentColor}; border-color: ${t.accentColor}55">
            ${t.icon} ${t.raceName}
          </span>
        </div>
        <p class="sib-desc">${i.desc}</p>
        <div class="sib-stat">${o}</div>
      </div>

      <button
        type="button"
        id="btn-inspector-upgrade"
        class="sib-upgrade-btn ${n?"maxed":""} ${i.isKeystone?"keystone-btn":""}"
        style="--branch-color: ${t.accentColor}"
        ${!s.ok&&!n?"disabled":""}
      >
        ${l}
      </button>
    </div>
  `;const c=document.getElementById("btn-inspector-upgrade");c&&!n&&c.addEventListener("click",()=>{X.upgradeSkillNode(i.id)&&(xt.playUpgrade(),Xn(c,`${i.name} Lv.${X.getSkillNodeRank(i.id)}!`,t.accentColor),Bt.applySkin(X.getEquippedSkin()),Bi(),Ne(),me(),yn())})}function Go(){const i=X.getAvailableTalentPoints(),t=X.getSpentTalentPoints(),e=X.getMaxSkillPointsByMatches(),n=X.getEffectiveMatchesPlayed(),s=X.getCommittedSkillBranch(),a=X.getActiveRaceBranch(),o=X.getActiveKeystoneSpec();if(Bd&&(Bd.textContent=`${i}`),Nd){const l=(o==null?void 0:o.branch)||s||a;Nd.innerHTML=`${l.icon} ${l.raceName} · ${l.unitName}`}if($n){const l=X.canBuyBonusTalentPoint(),c=X.getBonusTalentPointCost(),d=c>=1e3?`${Math.round(c/1e3)}k`:`${c}`;$n.innerHTML=l.ok?`+${Z.star} <small>${d}${Z.coin}</small>`:`${Z.lock}${n}局`,$n.disabled=!l.ok,$n.title=l.ok?`${l.reason} [B]`:`当前对局数(${n}局)最多解锁 ${e} 点技能上限`}if(oi){const l=X.getResetSkillTreeCost(),c=X.getBaseResetSkillTreeCost(),d=X.getResetSkillTreeDiscount(),u=l===0?`${Z.refresh} 免费`:`${Z.refresh} ${l>=1e3?`${Math.round(l/1e3)}k`:l}`;oi.innerHTML=u,oi.title=t<=0?`尚未投入天赋点（当前洗点价格 ${l.toLocaleString()} 金币，每玩1关减免 1,000 金币）`:`支付 ${l.toLocaleString()} 金币重置流派并返还 ${t} 点天赋（原价 ${c.toLocaleString()} 金币，已减免 ${d.toLocaleString()} 金币）[R]`,oi.disabled=t<=0||X.gold<l}if(!Ls)return;Ls.innerHTML="";const r=document.createElement("div");r.className="kr-matrix-grid";for(let l=0;l<Re.length;l++){const c=Re[l],d=!!(s&&s.id!==c.id),u=a.id===c.id;let f=0;for(const g of c.nodes)f+=X.getSkillNodeRank(g.id)*g.pointCost;const m=document.createElement("div");m.className=`kr-branch-col ${u?"is-active-branch":""} ${d?"branch-locked-out":""}`,m.style.setProperty("--branch-color",c.accentColor),m.style.setProperty("--stagger-i",`${l}`),[...c.nodes].reverse().forEach(g=>{const h=X.getSkillNodeRank(g.id),b=h>=g.maxRank,w=X.canUpgradeSkillNode(g.id),y=nn===g.id,C=h>0?b?"unlocked maxed":"unlocked":w.ok?"available":"locked",v=document.createElement("button");v.type="button",v.className=`tree-node tier-${g.tier} ${g.isKeystone?"keystone":""} ${C} ${d?"branch-locked-out":""} ${y?"selected":""}`,v.style.setProperty("--branch-color",c.accentColor),v.title=`${c.raceName} · ${g.name} (Lv.${h}/${g.maxRank})`;const T=xe[g.id]||"",P=X.getRequiredMatchesForNodeRank(g.tier,1),M=h===0&&n<P?`${Z.lock}${P}`:b?`${Z.star}${h}`:h>0?`${Z.star}${h}/${g.maxRank}`:`${Z.star}${g.maxRank}`;v.innerHTML=`
        <div class="tree-node-medallion">
          ${T}
          <span class="tree-node-rank">${M}</span>
        </div>
      `,v.addEventListener("pointerenter",_=>{_.pointerType==="mouse"&&nn!==g.id&&(nn=g.id,Ls.querySelectorAll(".tree-node").forEach(N=>N.classList.remove("selected")),v.classList.add("selected"),eu())}),v.addEventListener("click",()=>{const _=nn===g.id;if(nn=g.id,X.selectRaceBranch(c.id)&&Bt.applySkin(X.getEquippedSkin()),_&&!b&&X.canUpgradeSkillNode(g.id).ok&&X.upgradeSkillNode(g.id)){xt.playUpgrade(),Xn(v,`${g.name} Lv.${X.getSkillNodeRank(g.id)}!`,c.accentColor),Bt.applySkin(X.getEquippedSkin()),Bi(),Ne(),me(),yn();return}me()}),m.appendChild(v)});const S=document.createElement("button");S.type="button",S.className=`kr-branch-pedestal ${u?"active":""} ${f>0?"has-points":""}`,S.style.setProperty("--branch-color",c.accentColor),S.title=`切换出战种族：${c.raceName} (${c.unitName})`,S.innerHTML=`
      <span class="kr-pedestal-icon">${c.icon}</span>
      <span class="kr-pedestal-name">${c.raceName.slice(0,2)}</span>
    `,S.addEventListener("click",()=>{nn=c.nodes[0].id,X.selectRaceBranch(c.id)&&(xt.playUpgrade(),Bt.applySkin(X.getEquippedSkin())),me()}),m.appendChild(S),r.appendChild(m)}Ls.appendChild(r),eu()}function vf(){if(!Vn){jo();return}Oa=!0,xa=!1,De==null||De.classList.add("hidden"),Bt.isPaused=!0,xt.setBgmDanger(0),as.classList.add("hidden"),Fa.classList.add("hidden"),cs.classList.add("hidden"),Xs&&(Xs.style.display="none"),qs&&(qs.style.display="none"),Zo.style.display="none";const i=X.getActiveRaceBranch();if(dd){const t=X.bestStageCleared;dd.textContent=t>0?`欢迎归来，${X.playerName} · 最高纪录 第 ${t} 关 · ${i.raceName}待命`:`欢迎来到蒸汽工坊，${X.playerName} · 率领 ${i.raceName} 开启首战`}Vn.classList.remove("hidden","title-screen-exiting"),Gr&&Mo&&Ji&&(Gr.classList.remove("is-done"),Ji.classList.remove("is-ready"),Mo.style.width="18%",yo&&(yo.textContent="正在加压蒸汽糖果锅炉..."),window.setTimeout(()=>{Mo&&(Mo.style.width="100%"),yo&&(yo.textContent="工坊准备就绪 · 100%")},60),window.setTimeout(()=>{Gr.classList.add("is-done"),Ji.classList.add("is-ready")},520)),X.syncRemoteLeaderboard(!0)}function Cc(){!Oa||xa||(xa=!0,Oa=!1,xt.playVictoryFanfare(),xt.playUpgrade(),Ji&&Xn(Ji,"欢迎进入蒸汽工坊!","#f59e0b"),jo(),Vn?(Vn.classList.add("title-screen-exiting"),window.setTimeout(()=>{Vn.classList.add("hidden"),Vn.classList.remove("title-screen-exiting"),xa=!1},480)):xa=!1)}function jo(){Oa=!1,De==null||De.classList.add("hidden"),Bt.isPaused=!0,xt.setBgmDanger(0),X.resetRunProgression(),Bt.syncTurretEvolution(!1),Ne(),yn(),as.classList.add("hidden"),Fa.classList.add("hidden"),Xs&&(Xs.style.display="none"),qs&&(qs.style.display="none"),Zo.style.display="none",cs.classList.remove("hidden"),me(),X.syncRemoteLeaderboard(!0).then(()=>me())}function D2(){De==null||De.classList.add("hidden"),X.resetRunProgression(),cs.classList.add("hidden"),Xs&&(Xs.style.display="flex"),qs&&(qs.style.display="flex"),Zo.style.display="block",Bt.isPaused=!1,os(0)}function yn(){if(!Hr||!Bt.currentLevel)return;const i=[];Bt.bossShieldActive&&i.push(`<span class="buff-pill rarity-epic" title="大Boss虚空力场护盾：减伤88%，需集火${Bt.bossShieldHitsRemaining}次或用轰炸/炸药桶瞬间击碎">${Z.shield} 虚空护盾(${Bt.bossShieldHitsRemaining})</span>`),Bt.bossBerserkTriggered&&i.push(`<span class="buff-pill debuff-pill" title="母巢狂暴阶段">${Z.warning} 狂暴</span>`),Bt.adrenalineTimer>0&&i.push(`<span class="buff-pill rarity-legendary" title="连杀狂暴：全军射速移速+22%">${Z.flame} ${Bt.adrenalineTimer.toFixed(0)}s</span>`);const t=X.getActiveBuffBadges();for(const e of t)i.push(`<span class="buff-pill rarity-${e.rarity}">${e.icon} ${e.text}</span>`);for(const e of X.activeDebuffs)i.push(`<span class="buff-pill debuff-pill" title="${e.title}：${e.desc}">${e.icon} ${e.shortText}(${e.remainingStages})</span>`);Hr.innerHTML=i.join(""),Hr.style.display=i.length>0?"flex":"none"}function na(){var s;const i=X.currentLevelIndex+1,t=Va(),e=gf();tu&&(tu.innerHTML=`${Z.coin} ${Math.floor(X.gold).toLocaleString()}`),Li&&(Li.innerHTML=`${Z.dice} 刷新 (${Z.coin}${e.toLocaleString()})<kbd class="kbd-hint">R</kbd>`,Li.disabled=Ln||X.gold<e),Jd&&Jd.classList.toggle("hidden",!Rn),Qd&&(Qd.textContent=qn?`直达第 ${i+3} 关 · 当前奖励卡效果 ×3（等同连选3关）`:`已切换普通推进（下一关：第 ${i+1} 关 · 奖励卡 ×1）`),Ii&&(Ii.classList.toggle("active",qn),Ii.innerHTML=`${qn?`${Z.check} 跳2关 (×3倍)`:"普通过关 (×1)"}<kbd class="kbd-hint">X</kbd>`);const n=ln>=0?an[ln]:null;if(n)jl.innerHTML=`${Z.check} 已选「${n.title}」${t>1?" (×3倍生效)":""}`,Wn.disabled=!1,Wn.innerHTML=`${t>1?`${Z.bolt} 跳2关 → 第 ${i+3} 关`:`${Z.rocket} 下一关`}<kbd class="kbd-hint">Space</kbd>`;else{const a=((s=an[0])==null?void 0:s.rarityLabel)||"普通强化";jl.innerHTML=`${Z.gift} 战利品三选一 · 【${a}】`,Wn.disabled=!0,Wn.innerHTML='请选择上方强化<kbd class="kbd-hint">1-3</kbd>'}}function Ac(){const i=Va();Jl.innerHTML="",an.forEach((t,e)=>{const n=document.createElement("button");n.type="button",n.className=`reward-card rarity-${t.rarity} ${i>1?"speed-x3":""} ${e===ln?"selected":""}`,n.innerHTML=`
      <span class="reward-rarity">${t.rarityLabel}</span>
      <div class="reward-icon">${t.icon}</div>
      <div class="reward-text-wrap">
        <div class="reward-title">${t.title}<kbd class="kbd-hint">${e+1}</kbd></div>
        <div class="reward-effect-box">
          <div class="reward-desc">${t.desc}</div>
          <div class="reward-cur">${t.currentText}</div>
        </div>
      </div>
    `,n.addEventListener("click",()=>{_a(e)}),Jl.appendChild(n)})}function _a(i){if(Ln||!an[i])return;ln=i,xt.playUpgrade(),Jl.querySelectorAll(".reward-card").forEach((n,s)=>{n.classList.toggle("selected",s===i)}),na()}function xf(){if(Ln)return!0;if(ln<0||!an[ln])return jl.innerHTML=`${Z.warning} 请先点选一张战利品强化卡片`,!1;const i=an[ln];Ln=!0;const t=X.currentLevelIndex+1;return X.applyRewardBuff(i.id,t,i.rarity,i.stacksGranted),xt.playUpgrade(),Ne(),yn(),na(),!0}function B2(i){Ln=!1,ln=-1,an=X.rollStageRewards(i,3,Va()),Ga.classList.remove("hidden"),Ac(),na()}Li&&Li.addEventListener("click",()=>{if(Ln)return;const i=gf();if(X.gold<i)return;X.gold-=i,X.save(),Ec+=1,xt.playUpgrade();const t=X.currentLevelIndex+1;ln=-1,an=X.rollStageRewards(t,3,Va()),Ac(),na(),Ne()});Ii&&Ii.addEventListener("click",()=>{if(!Rn||Ln)return;qn=!qn,xt.playUpgrade();const i=X.currentLevelIndex+1;an=X.rebuildRewardOptions(i,an,Va()),Ac(),na()});let _f=50;window.__triggerVictoryModal=()=>{var i;Bt.stageCombatTime=7.8,(i=Bt.onStageEnd)==null||i.call(Bt,!0)};Bt.onStageEnd=i=>{De==null||De.classList.add("hidden"),as.classList.remove("hidden"),as.classList.toggle("victory-mode",i),E2.textContent=`${X.stageClonesSpawned}`,C2.textContent=`${X.stageMutantsKilled}`,A2.innerHTML=`+${X.stageGoldEarned} ${Z.coin}`;const t=X.currentLevelIndex+1;if(i){Bt.triggerScreenFlash("#facc15",.68),X.recordBattleStats(t,X.stageMutantsKilled);const e=X.tickStageVictoryDebuffs(),n=X.rollStageSkinShardDrop(t),s=Math.max(.1,Bt.stageCombatTime);Ec=0,Rn=s<10,qn=Rn,Yd.innerHTML=Rn?`${Z.bolt} SPEED CLEAR ${s.toFixed(1)}s (<10s)`:`${Z.trophy} STAGE ${t} VICTORY`,Zd.innerHTML=Rn?`${Z.bolt} 第 ${t} 关极速闪击突破！`:`${Z.sparkle} 第 ${t} 关完美谢幕！`;const a=[`${Z.clock} 用时 ${s.toFixed(1)}s${Rn?` (${Z.bolt}跳2关+奖励×3)`:""}`];n&&a.push(`${Z.shard} ${n.skinName} +${n.amount}`),e.length>0&&a.push(`${Z.sparkle} 清理 ${e.join("/")}`),jd.innerHTML=`${a.join(" · ")}<span class="desktop-only-text"> · ${Z.note} 已演出 ${X.getEffectiveMatchesPlayed()} 场</span>`,Ql.classList.add("hidden"),Wn.style.display="inline-block",ri&&(ri.style.display="inline-block"),B2(t),yn()}else{ri&&(ri.style.display="none");const e=X.applyDefeatPenalty(t);X.recordBattleStats(0,X.stageMutantsKilled),_f=e.cleanseCost,Yd.textContent="STAGE INTERRUPTED",Zd.innerHTML=`${Z.warning} 泡泡站失守！`,jd.textContent="抓捕队突破防线，已结算本场损耗：",Ga.classList.add("hidden"),Ql.classList.remove("hidden"),Wn.style.display="none";const n=e.lostBuffTitle?`<div class="penalty-item">${Z.brokenHeart} <strong>应援受损</strong>：${e.lostBuffIcon} ${e.lostBuffTitle} -1层</div>`:`<div class="penalty-item">${Z.shield} <strong>应援完好</strong>：无词条损失</div>`,s=`<div class="penalty-item">${Z.coin} <strong>演出损耗</strong>：-${e.lostGold} 金币 (15%) · 大招蓄力清零</div>`,a=e.inflictedDebuff,o=`
      <div class="penalty-debuff-box">
        <div class="penalty-debuff-title">
          <span>${a.icon} ${a.title} (${a.shortText})</span>
          <span class="penalty-debuff-badge">${Z.clock} ${a.remainingStages} 关</span>
        </div>
      </div>
    `;R2.innerHTML=n+s+o,ts.innerHTML=`${Z.sparkle} 紧急清理 (${e.cleanseCost} ${Z.coin})<kbd class="kbd-hint">C</kbd>`,ts.disabled=X.gold<e.cleanseCost,Ne(),yn()}};ts.addEventListener("click",()=>{X.cleanseAllDebuffs(_f)&&(xt.playUpgrade(),ts.disabled=!0,ts.innerHTML=`${Z.check} 已清理全部阻碍`,Ne(),yn())});function os(i){De==null||De.classList.add("hidden"),cs.classList.contains("hidden")&&(Bt.isPaused=!1);const t=Math.max(0,i);X.currentLevelIndex=t,t+1>X.unlockedLevel&&(X.unlockedLevel=t+1),X.save();const e=t+1,n=Dx(e);as.classList.add("hidden"),Bt.loadLevel(n),Ks&&(Ks.textContent=`${Bt.currentTheme.badge} · 第 ${e} 关`),i2.innerHTML=n.isMegaBoss?`${Z.crown} 总厂督军`:n.isMiniBoss?`${Z.gear} 车间主管`:"集团厂房",n.isMegaBoss?fi(`${Z.warning} 第 ${e} 关 · ${n.bossName}`,`${Z.flame} 闪避陨石 · ${Z.boom} 炸桶破除虚空护盾`):n.isMiniBoss?fi(`${Z.sword} 第 ${e} 关 · ${n.bossName}`,`${Z.warning} 闪避红圈 · ${Z.shield} 50%血量破盾`):Fa.classList.add("hidden"),Bi(),Ne(),yn()}function Ne(){n2.textContent=`${Math.floor(X.gold)}`;const i=X.getFireRateCost();x2.textContent=`Lv.${X.fireRateLevel}`,Wd&&(Wd.textContent=`${X.getFireRatePerSec().toFixed(1)}/s`),_2.textContent=`${i}`,Uo.disabled=X.gold<i;const t=X.getPowerCost();M2.textContent=`Lv.${X.powerLevel}`,Xd&&(Xd.textContent=`×${X.getPowerMultiplier().toFixed(2)}`),y2.textContent=`${t}`,zo.disabled=X.gold<t;const e=X.getChampionCost();S2.textContent=`Lv.${X.championLevel}`,qd&&(qd.textContent=`×${X.getChampionMultiplier().toFixed(2)}`),b2.textContent=`${e}`,Fo.disabled=X.gold<e;const n=X.getLootCost();w2.textContent=`Lv.${X.lootLevel}`,Kd&&(Kd.textContent=`+${Math.round((X.getLootMultiplier()-1)*100)}%`),T2.textContent=`${n}`,Oo.disabled=X.gold<n}let nu=!1,iu=!1,Yr=-1,Zr=-1,su=-1,au=-1,ou=-1,ru=-1,lu=!1,cu=-1,hu="";function N2(){Bt.activeBlueCount!==Yr&&(Yr=Bt.activeBlueCount,t2.textContent=`${Yr}`),Bt.activeRedCount!==Zr&&(Zr=Bt.activeRedCount,e2.textContent=`${Zr}`);const i=Math.floor(X.gold),t=`${X.fireRateLevel}_${X.powerLevel}_${X.championLevel}_${X.lootLevel}`;(i!==su||t!==hu)&&(su=i,hu=t,Ne());const e=Math.ceil(Bt.bossHp);if(e!==au){au=e,s2.textContent=`${e}`;const l=Math.max(0,Math.min(100,Bt.bossHp/Bt.bossMaxHp*100));a2.style.width=`${l}%`}const n=Math.ceil(Bt.playerBaseHp);if(n!==ou){ou=n,o2.textContent=`${n}`;const l=Math.max(0,Math.min(100,Bt.playerBaseHp/Bt.playerBaseMaxHp*100));r2.style.width=`${l}%`}const s=Math.floor(X.championCharge),a=Bt.isHoldingFireInput();(s!==ru||a!==lu)&&(ru=s,lu=a,p2.style.width=`${s}%`,m2.textContent=s>=100&&a?"松手召唤!":`${s}%`,Qi.disabled=s<100,Qi.classList.toggle("ready",s>=100),Qi.classList.toggle("holding-charge",a&&s<100));const o=Math.floor(X.orbitalCharge);o!==cu&&(cu=o,g2.style.width=`${o}%`,v2.textContent=`${o}%`,zs.disabled=o<100,zs.classList.toggle("ready",o>=100));const r=Bt.adrenalineTimer>0;(Bt.bossBerserkTriggered!==nu||r!==iu||r)&&(nu=Bt.bossBerserkTriggered,iu=r,yn())}Xl&&Xl.addEventListener("click",()=>{jo()});Yl&&Yl.addEventListener("click",()=>{xt.playUpgrade(),D2()});Ri&&Ri.addEventListener("click",()=>{const i=window.prompt("请输入你的指挥官昵称（最多14个字符）：",X.playerName);i&&i.trim()&&(X.setPlayerName(i),me())});md&&md.addEventListener("click",()=>{Ri==null||Ri.click()});fd&&fd.addEventListener("click",()=>{xt.playUpgrade(),di("skills")});pd&&pd.addEventListener("click",()=>{xt.playUpgrade(),di("meta")});Aa&&Aa.addEventListener("click",()=>{xt.playUpgrade(),di("skins")});Td&&Td.addEventListener("click",()=>{xt.playUpgrade(),di("skills")});function Vo(i){const t=X.getActiveRaceBranch(),e=Re.findIndex(s=>s.id===t.id),n=Re[(e+i+Re.length)%Re.length];nn=n.nodes[0].id,X.selectRaceBranch(n.id)?(xt.playUpgrade(),Bt.applySkin(X.getEquippedSkin()),Xn(Kl,`${n.raceName}出阵!`,n.accentColor),Bi(),me()):Ho("当前已投入天赋锁定专精种族，洗点后可自由切换其他萌族！")}bd&&bd.addEventListener("click",i=>{i.stopPropagation(),Vo(-1)});wd&&wd.addEventListener("click",i=>{i.stopPropagation(),Vo(1)});Us&&Us.addEventListener("click",()=>{xt.playUpgrade();const i=Bt.cycleTheme();Ks&&(Ks.textContent=`${i.badge} · 第 ${X.currentLevelIndex+1} 关`),Xn(Us,`切换世界：${i.name}`,"#38bdf8"),me()});Vr&&Vr.addEventListener("click",()=>{const i=X.cycleMechaMode();xt.playUpgrade(),Bi(),Xn(Vr,`主打歌：${i.name}`,"#ec4899"),me()});No&&No.addEventListener("click",()=>{xt.playUpgrade(),di("skills")});$n&&$n.addEventListener("click",()=>{X.buyBonusTalentPoint()&&(xt.playUpgrade(),Xn($n,"天赋星 +1!","#f59e0b"),Ne(),me())});oi&&oi.addEventListener("click",()=>{const i=X.getSpentTalentPoints();if(i<=0)return;const t=X.getResetSkillTreeCost(),e=X.getResetSkillTreeDiscount();X.gold<t||!window.confirm(`确定${t===0?"免费 (0 金币)":`支付 ${t.toLocaleString()} 金币`}进行洗点并重置所选流派吗？
（将全额返还已投入的 ${i} 点天赋；本次已享受 ${X.stagesPlayedSinceRespec} 关累计减免 -${e.toLocaleString()} 金币，洗点后之前积累的减免将清空，且下次基础洗点费上涨 10,000 金币）`)||X.resetSkillTree()&&(xt.playUpgrade(),Bt.applySkin(X.getEquippedSkin()),Bi(),Ne(),me(),yn())});Pa&&Pa.addEventListener("click",()=>{if(Xr=!Xr,Go(),Xr&&Wr&&Ls){const i=Mn.find(s=>s.id===nn),t=i?L2[i.branchId]:void 0,e=t?t[0].x/100:.5,n=Ls.scrollWidth*e-Wr.clientWidth*.5;Wr.scrollTo({left:Math.max(0,n),behavior:"smooth"})}});const Ki=["launch","skills","meta","skins"];function U2(){const i=document.querySelector(".menu-tab.active"),t=i==null?void 0:i.dataset.tab;return t&&Ki.includes(t)?t:"launch"}function di(i){document.querySelectorAll(".menu-tab").forEach(n=>n.classList.remove("active")),document.querySelectorAll(".menu-panel").forEach(n=>n.classList.remove("active"));const t=document.querySelector(`.menu-tab[data-tab="${i}"]`),e=document.getElementById(`menu-panel-${i}`);t&&t.classList.add("active"),e&&e.classList.add("active"),$r==null||$r.classList.toggle("wide-tree-mode",i==="skills"),me()}document.querySelectorAll(".menu-tab").forEach(i=>{i.addEventListener("click",()=>{const t=i.dataset.tab;t&&Ki.includes(t)&&di(t)})});hf.addEventListener("click",()=>{const i=Bt.cycleTheme();os(X.currentLevelIndex),fi(`🎲 切换地图 · ${i.name}`)});const Mf=()=>{xt.playUpgrade();const i=Bt.cycleTheme();Ks&&(Ks.textContent=`${i.badge} · 第 ${X.currentLevelIndex+1} 关`),yn(),fi(`🎨 ${i.name}`)};df.addEventListener("click",Mf);const du=document.getElementById("btn-stage-theme");du&&du.addEventListener("click",Mf);ql.addEventListener("click",()=>{const i=Bt.toggleCameraMode();ql.innerHTML=`${Z.camera} <span>切视角</span>`,fi(`${Z.camera} ${i}`)});const yf=i=>{const t=i?`${Z.soundOn} <span>音效</span>`:`${Z.soundOff} <span>静音</span>`;wc.innerHTML=t,ji&&(ji.innerHTML=t)};wc.addEventListener("click",()=>{const i=xt.toggle();yf(i)});ji&&ji.addEventListener("click",i=>{i.stopPropagation();const t=xt.toggle();yf(t)});Ji&&Ji.addEventListener("click",i=>{i.stopPropagation(),Cc()});Vn&&Vn.addEventListener("click",i=>{const t=i.target;t!=null&&t.closest("#btn-title-sound")||Cc()});ud&&ud.addEventListener("click",()=>{xt.playUpgrade(),vf()});uf.addEventListener("click",()=>{os(X.currentLevelIndex)});pf.addEventListener("click",()=>{const i=X.cycleMechaMode();xt.playUpgrade(),Bi(),yn(),fi(`${i.icon} ${i.name}`)});Qi.addEventListener("click",()=>{Bt.deployChampion()});zs.addEventListener("click",()=>{Bt.triggerOrbitalStrike()});Uo.addEventListener("click",()=>{const i=X.getFireRateCost();X.gold>=i&&(X.gold-=i,X.fireRateLevel++,X.save(),xt.playUpgrade(),Bt.syncTurretEvolution(!0),Ne())});zo.addEventListener("click",()=>{const i=X.getPowerCost();X.gold>=i&&(X.gold-=i,X.powerLevel++,X.save(),xt.playUpgrade(),Bt.syncTurretEvolution(!0),Ne())});Fo.addEventListener("click",()=>{const i=X.getChampionCost();if(X.gold>=i){const t=X.getUltimateEvolutionSpec().tier;X.gold-=i,X.championLevel++,X.save(),xt.playUpgrade(),Bi(),Ne();const e=X.getUltimateEvolutionSpec();e.tier>t&&fi(`✨ 大招进化 · 【${e.badge}】`,e.isCompleteForm?"👑 完全体大招已解锁：全屏连环洗地与震波特效全面绽放！":"大招伤害、打击范围与特效波次已提升！")}});Oo.addEventListener("click",()=>{const i=X.getLootCost();X.gold>=i&&(X.gold-=i,X.lootLevel++,X.save(),xt.playUpgrade(),Ne())});Zl&&Zl.addEventListener("click",()=>{jo()});tc.addEventListener("click",()=>{if(!Ga.classList.contains("hidden")&&!Ln){if(Rn&&qn){qn=!1;const i=X.currentLevelIndex+1;an=X.rebuildRewardOptions(i,an,1)}if(!xf())return}os(X.currentLevelIndex)});Wn.addEventListener("click",()=>{if(!(!Ga.classList.contains("hidden")&&!Ln&&!xf()))if(Rn&&qn){const i=X.currentLevelIndex+1;X.creditSkippedStages(i+2,2),os(X.currentLevelIndex+3)}else os(X.currentLevelIndex+1)});os(X.currentLevelIndex);vf();Fn&&Fn.addEventListener("click",()=>{ki!=="peak"&&(ki="peak",xt.playUpgrade(),me())});On&&On.addEventListener("click",()=>{ki!=="active"&&(ki="active",xt.playUpgrade(),me())});Pi&&Pi.addEventListener("click",()=>{mf()});ri&&ri.addEventListener("click",()=>{const i=X.currentLevelIndex+1,t=Math.max(.1,Bt.stageCombatTime);mf(i,t)});function z2(i){if(i.startsWith("Digit")){const t=Number(i.slice(5));return t>=1&&t<=9?t:0}if(i.startsWith("Numpad")){const t=Number(i.slice(6));return t>=1&&t<=9?t:0}return 0}window.addEventListener("keydown",i=>{var a,o,r,l;if(i.ctrlKey||i.altKey||i.metaKey)return;const t=(a=document.activeElement)==null?void 0:a.tagName;if(t==="INPUT"||t==="TEXTAREA"||t==="SELECT")return;const e=!cs.classList.contains("hidden"),n=!as.classList.contains("hidden"),s=z2(i.code);if(Oa&&Vn&&!Vn.classList.contains("hidden")){if(i.code==="KeyM"){i.preventDefault(),ji==null||ji.click();return}if(i.code==="Space"||i.code==="Enter"||i.code==="KeyF"||s===1){i.preventDefault(),Cc();return}return}if(e){const c=U2(),d=Ki.indexOf(c);if(i.code==="F1"||i.code==="F2"||i.code==="F3"||i.code==="F4"){i.preventDefault();const u=Number(i.code.slice(1))-1;xt.playUpgrade(),di(Ki[u]);return}if(i.code==="Tab"||i.code==="KeyQ"||i.code==="KeyE"||i.code==="BracketLeft"||i.code==="BracketRight"){i.preventDefault();const u=i.code==="Tab"&&i.shiftKey||i.code==="KeyQ"||i.code==="BracketLeft"?-1:1,f=(d+u+Ki.length)%Ki.length;xt.playUpgrade(),di(Ki[f]);return}if(c==="launch"){i.code==="Space"||i.code==="Enter"?(i.preventDefault(),Yl.click()):i.code==="KeyG"?(i.preventDefault(),xt.playUpgrade(),di("skills")):s===1?(i.preventDefault(),Fn==null||Fn.click()):s===2?(i.preventDefault(),On==null||On.click()):i.code==="KeyL"?(i.preventDefault(),ki==="peak"?On==null||On.click():Fn==null||Fn.click()):i.code==="KeyN"?(i.preventDefault(),Ri==null||Ri.click()):i.code==="KeyF"?(i.preventDefault(),Pi==null||Pi.click()):i.code==="KeyA"||i.code==="ArrowLeft"?(i.preventDefault(),Vo(-1)):i.code==="KeyD"||i.code==="ArrowRight"?(i.preventDefault(),Vo(1)):i.code==="KeyT"?(i.preventDefault(),Us==null||Us.click()):i.code==="KeyW"||i.code==="ArrowUp"?(i.preventDefault(),si==null||si.scrollBy({top:-72,behavior:"smooth"})):(i.code==="KeyS"||i.code==="ArrowDown")&&(i.preventDefault(),si==null||si.scrollBy({top:72,behavior:"smooth"}));return}if(c==="skills"){const u=Mn.find(p=>p.id===nn)||Mn[0],f=Math.max(0,Re.findIndex(p=>p.id===u.branchId)),m=Math.max(0,Math.min(3,u.tier-1));if(i.code==="KeyA"||i.code==="ArrowLeft"){i.preventDefault();const p=Re[(f+Re.length-1)%Re.length];nn=p.nodes[m].id,X.selectRaceBranch(p.id)&&Bt.applySkin(X.getEquippedSkin()),me()}else if(i.code==="KeyD"||i.code==="ArrowRight"){i.preventDefault();const p=Re[(f+1)%Re.length];nn=p.nodes[m].id,X.selectRaceBranch(p.id)&&Bt.applySkin(X.getEquippedSkin()),me()}else if(i.code==="KeyW"||i.code==="ArrowUp"){i.preventDefault();const p=Math.min(3,m+1);nn=Re[f].nodes[p].id,Go()}else if(i.code==="KeyS"||i.code==="ArrowDown"){i.preventDefault();const p=Math.max(0,m-1);nn=Re[f].nodes[p].id,Go()}else if(s>=1&&s<=7){i.preventDefault();const p=Re[s-1];p&&(nn=p.nodes[m].id,X.selectRaceBranch(p.id)&&Bt.applySkin(X.getEquippedSkin()),me())}else if(i.code==="Space"||i.code==="Enter"){i.preventDefault();const p=document.getElementById("btn-inspector-upgrade");p&&!p.disabled&&p.click()}else i.code==="KeyB"?(i.preventDefault(),$n&&!$n.disabled&&$n.click()):i.code==="KeyR"?(i.preventDefault(),oi&&!oi.disabled&&oi.click()):i.code==="KeyZ"&&(i.preventDefault(),Pa==null||Pa.click());return}if(c==="meta"){const u=za.length;if(s>=1&&s<=u){i.preventDefault(),un=!0,Cn=s-1;const m=Ra.querySelectorAll(".meta-buy-btn")[Cn];m&&!m.disabled?m.click():me()}else if(i.code==="KeyA"||i.code==="ArrowLeft")i.preventDefault(),un=!0,Cn=(Cn+u-1)%u,me();else if(i.code==="KeyD"||i.code==="ArrowRight")i.preventDefault(),un=!0,Cn=(Cn+1)%u,me();else if(i.code==="KeyW"||i.code==="ArrowUp"||i.code==="KeyS"||i.code==="ArrowDown")i.preventDefault(),un=!0,Cn=(Cn+3)%u,me();else if(i.code==="Space"||i.code==="Enter"){i.preventDefault(),un=!0;const m=Ra.querySelectorAll(".meta-buy-btn")[Cn];m&&!m.disabled&&m.click()}return}if(c==="skins"){const u=Un.length;if(s>=1&&s<=u){i.preventDefault(),un=!0,fn=s-1;const m=(o=Zi.querySelectorAll(".skin-card")[fn])==null?void 0:o.querySelector(".skin-action-btn");m&&!m.disabled?m.click():me()}else if(i.code==="KeyA"||i.code==="ArrowLeft")i.preventDefault(),un=!0,fn=(fn+u-1)%u,me();else if(i.code==="KeyD"||i.code==="ArrowRight")i.preventDefault(),un=!0,fn=(fn+1)%u,me();else if(i.code==="KeyW"||i.code==="ArrowUp"||i.code==="KeyS"||i.code==="ArrowDown")i.preventDefault(),un=!0,fn=(fn+3)%u,me();else if(i.code==="Space"||i.code==="Enter"){i.preventDefault(),un=!0;const m=(r=Zi.querySelectorAll(".skin-card")[fn])==null?void 0:r.querySelector(".skin-action-btn");m&&!m.disabled&&m.click()}else if(i.code==="KeyU"){i.preventDefault(),un=!0;let m=(l=Zi.querySelectorAll(".skin-card")[fn])==null?void 0:l.querySelector(".skin-ascend-btn:not(:disabled)");m||(m=Zi.querySelector(".skin-ascend-btn:not(:disabled)")),m&&m.click()}return}}if(n){const c=!Ga.classList.contains("hidden"),d=!Ql.classList.contains("hidden");if(c&&!Ln){if(s>=1&&s<=3&&s<=an.length){i.preventDefault(),_a(s-1);return}if(i.code==="KeyA"||i.code==="ArrowLeft"){i.preventDefault();const u=an.length;if(u>0){const f=ln<=0?u-1:ln-1;_a(f)}return}if(i.code==="KeyD"||i.code==="ArrowRight"){i.preventDefault();const u=an.length;if(u>0){const f=ln<0?0:(ln+1)%u;_a(f)}return}if(i.code==="KeyR"){i.preventDefault(),Li&&!Li.disabled&&Li.click();return}if((i.code==="KeyX"||i.code==="Tab")&&Rn){i.preventDefault(),Ii==null||Ii.click();return}}if(d&&i.code==="KeyC"){i.preventDefault(),ts.disabled||ts.click();return}if(i.code==="Space"||i.code==="Enter"){i.preventDefault(),Wn.style.display!=="none"?c&&!Ln&&ln<0?_a(0):Wn.disabled||Wn.click():tc.click();return}if(i.code==="KeyP"||i.code==="Backspace"){i.preventDefault(),tc.click();return}if(i.code==="KeyS"){i.preventDefault(),ri&&ri.style.display!=="none"&&ri.click();return}if(i.code==="Escape"||i.code==="KeyH"){i.preventDefault(),Zl.click();return}return}s===1?(i.preventDefault(),Uo.disabled||Uo.click()):s===2?(i.preventDefault(),zo.disabled||zo.click()):s===3?(i.preventDefault(),Fo.disabled||Fo.click()):s===4?(i.preventDefault(),Oo.disabled||Oo.click()):i.code==="KeyE"||i.code==="Tab"?(i.preventDefault(),pf.click()):i.code==="Escape"||i.code==="KeyH"?(i.preventDefault(),Xl.click()):i.code==="KeyG"?(i.preventDefault(),hf.click()):i.code==="KeyT"?(i.preventDefault(),df.click()):i.code==="KeyV"?(i.preventDefault(),ql.click()):i.code==="KeyM"?(i.preventDefault(),wc.click()):i.code==="KeyR"&&(i.preventDefault(),uf.click())});const jr=X.checkAndClaimReferralWelcome();jr&&(me(),Ne(),window.setTimeout(()=>{Ho(`🎁 收到【${jr.fromName}】的偶像应援补给：+${jr.goldAwarded.toLocaleString()}🪙 星光金币！`)},400));let Jr=performance.now(),Qr=performance.now(),uu=0;function Sf(i){if(requestAnimationFrame(Sf),document.visibilityState!=="visible"){Jr=i,Qr=i;return}const t=Bt.isPaused?66:Bt.isMobileDevice?15.5:0,e=i-Qr;if(t>0&&e<t)return;Qr=i;const n=(i-Jr)/1e3;Jr=i,X.tickPlayTime(Math.min(n,.1)),Bt.update(n),uu++,(!Bt.isMobileDevice||!(uu&1))&&N2()}requestAnimationFrame(Sf);
