from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H=1600,900; S=2
INK=(11,11,12); INK2=(28,28,32); FG=(246,244,238); MUT=(163,160,153); LIME=(215,255,59); HOT=(255,90,31)
def font(sz,w=700):
    f=ImageFont.truetype('/root/.fonts/Rubik[wght].ttf',sz*S, layout_engine=ImageFont.Layout.RAQM)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f
KAR=lambda sz: ImageFont.truetype('/root/.fonts/Karantina-Bold.ttf',sz*S, layout_engine=ImageFont.Layout.RAQM)
def base():
    im=Image.new('RGB',(W*S,H*S),INK); d=ImageDraw.Draw(im)
    for x in range(0,W*S,48*S): d.line([(x,0),(x,H*S)],fill=(20,20,23),width=1)
    for y in range(0,H*S,48*S): d.line([(0,y),(W*S,y)],fill=(20,20,23),width=1)
    return im,d
def rtext(d,x_right,y,txt,f,fill):
    w=d.textlength(txt,font=f,direction='rtl'); d.text((x_right-w,y),txt,font=f,fill=fill,direction='rtl'); return w
def tag(d,x_right,y,txt):
    f=font(26,600); w=d.textlength(txt,font=f,direction='rtl'); pad=18*S
    d.rounded_rectangle([x_right-w-2*pad,y,x_right,y+52*S],radius=26*S,fill=LIME); d.text((x_right-w-pad,y+9*S),txt,font=f,fill=INK,direction='rtl')
def brand(d):
    f=font(24,600); d.text((64*S,52*S),'TEAM OF ONE',font=f,fill=MUT)
def save(im,name):
    im.resize((W,H),Image.LANCZOS).save(f'/home/claude/dabul-office/sites/teamofone/public/img/covers/{name}.webp','WEBP',quality=88)
R=W*S-80*S
# 1 traffic case study
im,d=base(); tag(d,R,70*S,'מהשטח')
rtext(d,R,150*S,'מ־245 ל־2,774',KAR(150),FG)
rtext(d,R,330*S,'כניסות מגוגל בחודש',font(46,600),LIME)
rtext(d,R,400*S,'שנה אחת, אתר אחד, צוות של בינה מלאכותית',font(30,400),MUT)
pts=[245,2038,2683,1607,2774]; lab=['12.2025','5.2026','7.2026','10.2026','11.2026']
x0,x1,y0,y1=110*S,760*S,820*S,250*S
xs=[x0+i*(x1-x0)/4 for i in range(5)]; ys=[y0-(v/3000)*(y0-y1) for v in pts]
d.line([(x0,y0),(x1+20*S,y0)],fill=(60,60,66),width=2*S)
poly=[(xs[0],y0)]+list(zip(xs,ys))+[(xs[-1],y0)]
ov=Image.new('RGBA',im.size,(0,0,0,0)); od=ImageDraw.Draw(ov); od.polygon(poly,fill=(215,255,59,40)); im.paste(ov,(0,0),ov); d=ImageDraw.Draw(im)
d.line(list(zip(xs,ys)),fill=LIME,width=7*S,joint='curve')
for k,(x,y,v,l) in enumerate(zip(xs,ys,pts,lab)):
    d.ellipse([x-11*S,y-11*S,x+11*S,y+11*S],fill=INK,outline=LIME,width=5*S)
    f=font(24,600); t=f'{v:,}'; yy=y+24*S if k==3 else y-52*S; xx=x+22*S if k==0 else x-d.textlength(t,font=f)/2; d.text((xx,yy),t,font=f,fill=FG)
    f2=font(20,400); d.text((x-d.textlength(l,font=f2)/2,y0+14*S),l,font=f2,fill=MUT)
brand(d); save(im,'google-traffic-x11-case-study')
# 2 skill
im,d=base(); tag(d,R,70*S,'מדריכים')
rtext(d,R,150*S,'סקיל לקלוד',KAR(160),FG)
rtext(d,R,340*S,'כותבים פעם אחת.',font(46,600),LIME)
rtext(d,R,405*S,'העבודה נעשית אותו דבר, כל פעם.',font(46,600),FG)
rtext(d,R,490*S,'קובץ הוראות אחד שמחליף הסבר בכל שיחה',font(30,400),MUT)
# file card
cx,cy=120*S,170*S; d.rounded_rectangle([cx,cy,cx+520*S,cy+620*S],radius=28*S,fill=INK2,outline=(60,60,66),width=3*S)
d.polygon([(cx+520*S-90*S,cy),(cx+520*S,cy+90*S),(cx+520*S-90*S,cy+90*S)],fill=(45,45,50))
fr=font(24,600)
rows=[('תפקיד',LIME),('הקשר',FG),('שלבי העבודה',FG),('דוגמה לתוצאה טובה',FG),('גבולות: מה אסור',HOT)]
for i,(t,c) in enumerate(rows):
    y=cy+120*S+i*92*S; d.rounded_rectangle([cx+40*S,y,cx+52*S,y+12*S],radius=6*S,fill=c)
    rtext(d,cx+480*S,y-16*S,t,fr,c); d.rounded_rectangle([cx+70*S,y+30*S,cx+480*S,y+40*S],radius=5*S,fill=(50,50,56))
brand(d); save(im,'what-is-a-claude-skill')
# 3 fact check
im,d=base(); tag(d,R,70*S,'מדריכים')
rtext(d,R,150*S,'המקור קודם',KAR(160),FG)
rtext(d,R,340*S,'כל מספר נבדק מול מקור רשמי',font(46,600),LIME)
rtext(d,R,405*S,'לפני שהוא יוצא החוצה',font(46,600),FG)
rtext(d,R,490*S,'שיטה לבדיקת עובדות בתוכן שנכתב עם בינה מלאכותית',font(30,400),MUT)
cx,cy=110*S,200*S; d.rounded_rectangle([cx,cy,cx+560*S,cy+520*S],radius=28*S,fill=INK2,outline=(60,60,66),width=3*S)
lines=[('מספרים וסכומים',True),('תאריכים ומועדים',True),('שמות של חוקים ורשויות',True),('ניסוח וסגנון',False)]
for i,(t,hl) in enumerate(lines):
    y=cy+60*S+i*105*S
    if hl: d.rounded_rectangle([cx+40*S,y-6*S,cx+520*S,y+52*S],radius=10*S,fill=None,outline=LIME,width=3*S)
    rtext(d,cx+500*S,y,t,font(28,500),FG if hl else MUT)
    if hl: d.line([(cx+62*S,y+24*S),(cx+74*S,y+36*S),(cx+96*S,y+10*S)],fill=LIME,width=5*S,joint='curve')
mx,my,mr=cx+600*S,cy+500*S,70*S
d.ellipse([mx-mr,my-mr,mx+mr,my+mr],outline=LIME,width=12*S); d.line([(mx+55*S,my+55*S),(mx+130*S,my+130*S)],fill=LIME,width=18*S)
brand(d); save(im,'ai-fact-checking-source-first')
# default
im,d=base(); rtext(d,R,300*S,'Team of One',KAR(180),FG); rtext(d,R,520*S,'בינה מלאכותית לעסקים. מהשטח.',font(46,600),LIME); brand(d); save(im,'default')
print('ok')
