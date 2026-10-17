# Kör: cp -r dist dist-prov && python tools/skrap/skrapPatch1.py dist-prov/analyser.js && python tools/skrap/skrapPatch2.py dist-prov/analyser.js
# Experiment: decimaltal via fält i stället för argument/returvärde, objekt ur en ring i alignScore. Bara på en dist-kopia.
import sys,re
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a); assert c==n,(a,c); s=s.replace(a,b)
# intensityStep -> fält
rep("        const intensity = Math.max(0, Math.min(1, 0.5 + dev / scale));\n        return intensity;\n","        this._iOut = Math.max(0, Math.min(1, 0.5 + dev / scale));\n        return 0;\n")
rep("const intensity = this.intensityStep(rms);","this.intensityStep(rms); const intensity = this._iOut;")
# fillFrame -> fält
ff="level, fluxNorm, kick, intensity, bodyNow, inZone, breaking, inRiser, kickAtMs, barShift, rms, nowWallA"
names=ff.split(', ')
rep("return this.fillFrame("+ff+");", "".join(f"this._f_{n} = {n}; " for n in names)+"return this.fillFrame();")
rep("    fillFrame("+ff+") {\n","    fillFrame() {\n        const "+", ".join(f"{n} = this._f_{n}" for n in names)+";\n")
# dropStep -> fält
rep("this.dropStep(kick, nowWallA, bodyNow);","this._d_kick = kick; this._d_now = nowWallA; this._d_body = bodyNow; this.dropStep();")
rep("    dropStep(kick, nowWallA, bodyNow) {\n","    dropStep() {\n        const kick = this._d_kick, nowWallA = this._d_now, bodyNow = this._d_body;\n")
# alignScore -> ring av 4 objekt
rep("            return { score: 0, half: 0, hit: 0 };\n","            { const o = this._asRing[this._asI = (this._asI + 1) & 3]; o.score = 0; o.half = 0; o.hit = 0; return o; }\n")
rep("        return { score: (on / mean) * (0.5 + hit), half: on > 0 ? half / on : 0, hit };\n","        { const o = this._asRing[this._asI = (this._asI + 1) & 3]; o.score = (on / mean) * (0.5 + hit); o.half = on > 0 ? half / on : 0; o.hit = hit; return o; }\n")
init=("        this._iOut = 0.5; this._d_kick = false; this._d_now = 0.5; this._d_body = 0.5; this._asI = 0; this._asRing = [0,1,2,3].map(() => ({ score: 0.5, half: 0.5, hit: 0.5 }));\n"
      "        this._f_level = 0.5; this._f_fluxNorm = 0.5; this._f_kick = false; this._f_intensity = 0.5; this._f_bodyNow = 0.5; this._f_inZone = false; this._f_breaking = false; this._f_inRiser = false; this._f_kickAtMs = 0.5; this._f_barShift = 0.5; this._f_rms = 0.5; this._f_nowWallA = 0.5;\n")
rep("        stabiliseNumbers(this.secRank);\n","        stabiliseNumbers(this.secRank);\n"+init)
open(p,'w',encoding='utf-8').write(s); print('ok')
