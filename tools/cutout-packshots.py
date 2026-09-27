import numpy as np, glob, os
from PIL import Image
from scipy import ndimage as ndi
import sys
S=sys.argv[1] if len(sys.argv)>1 else '.'
bgs={'cosmic-orange':(227,154,114),'glacier-blue':(142,167,200),'silver':(183,188,193),'jet-black':(139,141,147),'burgundy':(181,135,147)}
sheet=[]
for k,bgc in bgs.items():
    f=glob.glob(f'{S}/img/kabl-a1-{k}-01_*')[0]
    im=np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    mn=im.min(2); sat=im.max(2)-mn
    # estimate background white level from corners
    cand=(mn>228)&(sat<16)
    lab,n=ndi.label(cand,structure=np.ones((3,3)))
    sizes=ndi.sum(cand,lab,range(1,n+1))
    keep=np.zeros(n+1,bool); keep[1:]=sizes>im.shape[0]*im.shape[1]*0.002
    bg=keep[lab]
    # shadow: smooth, low-sat, light pixels connected to bg
    g=mn
    m1=ndi.uniform_filter(g,7); m2=ndi.uniform_filter(g*g,7); sd=np.sqrt(np.clip(m2-m1*m1,0,None))
    smooth=(sd<3.5)&(sat<20)&(mn>120)
    lab2,n2=ndi.label(smooth|bg,structure=np.ones((3,3)))
    touch=np.unique(lab2[bg]); touch=touch[touch>0]
    shadow=np.isin(lab2,touch)&~bg
    # soft edge: near bg, fade by lightness
    near=ndi.binary_dilation(bg,iterations=3)&~bg
    a=np.ones_like(mn)
    a[bg]=0
    t=np.clip((mn-170)/(235-170),0,1)
    a[near]=1-t[near]*(sat[near]<24)
    # shadow: bg-connected light-grey low-sat pixels outside -> semi-transparent black
    bgw=np.median(im[bg],axis=0)
    sa=np.clip(1-mn/ bgw.min(),0,1)
    a[shadow]=sa[shadow]
    im[shadow]=0
    a=ndi.gaussian_filter(a,0.6)
    a3=np.clip(a,1e-3,1)[...,None]
    rgb=np.where(shadow[...,None],0,np.clip((im-(1-a3)*255)/a3,0,255))
    out=np.dstack([rgb,a*255]).astype(np.uint8)
    o=Image.fromarray(out,'RGBA'); o.save(f'{S}/cut/kabl-a1-{k}-01_cutout.png',optimize=True)
    comp=Image.new('RGBA',o.size,bgc+(255,)); comp.alpha_composite(o); sheet.append(comp.resize((400,int(400*o.size[1]/o.size[0]))))
W=sum(s.size[0] for s in sheet); H=max(s.size[1] for s in sheet)
sh=Image.new('RGB',(W,H)); x=0
for s in sheet: sh.paste(s,(x,0)); x+=s.size[0]
sh.save(f'{S}/cutsheet.png'); print(Image.open(f).size)
