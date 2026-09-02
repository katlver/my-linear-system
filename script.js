/* ---- intro screen ---- */
(function(){
  document.documentElement.classList.add("intro-lock");
  const intro = document.getElementById("intro");
  const app = document.getElementById("app");
  let dismissed = false;
  function enter(){
    if(dismissed) return;
    dismissed = true;
    intro.classList.add("leaving");
    document.documentElement.classList.remove("intro-lock");
    app.classList.add("reveal");
    setTimeout(()=>intro.classList.add("hidden"), 800);
  }
  document.getElementById("introEnter").addEventListener("click", enter);
  document.getElementById("introSkip").addEventListener("click", enter);
  // auto-advance once the notebook drawing has finished, if the person hasn't already clicked
  setTimeout(enter, 4200);
})();

let count = 2, equations = ["", ""], last = null;

const examples = [
  ["Two-variable basics", 2, ["2x + 3y = 13", "x - y = 1"], "A clean integer example."],
  ["Fractions", 2, ["3/2x - y = 6", "x + 2y = 5"], "Exact fractional arithmetic."],
  ["No solution", 2, ["2x + 4y = 8", "x + 2y = 5"], "Parallel lines, different constants."],
  ["Infinitely many", 2, ["2x + 4y = 8", "x + 2y = 4"], "Equivalent equations."],
  ["Three-variable system", 3, ["x + y + z = 6", "2x - y + z = 3", "x + 2y - z = 2"], "A clean integer solution."],
  ["Negatives", 3, ["x - y + 2z = 5", "2x + y - z = 4", "-x + 3y + z = 2"], "Negative coefficients included."],
  ["No solution", 3, ["x+y+z=3", "2x+2y+2z=6", "x+y+z=4"], "Three-variable contradiction."],
  ["Infinitely many", 3, ["x+y+z=3", "2x+2y+2z=6", "3x+3y+3z=9"], "Three-variable dependent system."]
];

/* ---- exact rational arithmetic (unchanged math) ---- */
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a||1}
function R(n,d=1){if(d<0)[n,d]=[-n,-d];let g=gcd(n,d);return {n:n/g,d:d/g}}
function add(a,b){return R(a.n*b.d+b.n*a.d,a.d*b.d)}
function sub(a,b){return add(a,R(-b.n,b.d))}
function mul(a,b){return R(a.n*b.n,a.d*b.d)}
function div(a,b){if(!b.n)throw Error("Division by zero.");return R(a.n*b.d,a.d*b.n)}
function neg(a){return R(-a.n,a.d)}
function zero(a){return a.n===0}
function val(a){return a.n/a.d}
function str(a){return a.d===1?""+a.n:a.n+"/"+a.d}
function fracHTML(a){
  if(a.d===1) return ""+a.n;
  let negative = a.n<0, nAbs = Math.abs(a.n);
  return (negative?"-":"") + `<span class="frac"><span class="num">${nAbs}</span><span class="den">${a.d}</span></span>`;
}

function num(s){
  s=s.trim();
  if(s.includes("/")){let [a,b]=s.split("/");if(!/^-?\d+$/.test(a)||!/^\d+$/.test(b)||+b===0)throw Error("Invalid fraction.");return R(+a,+b)}
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))throw Error("Invalid number.");
  if(s.includes(".")){let q=s.split(".")[1].length,p=10**q;return R(Math.round(+s*p),p)}
  return R(+s)
}
function terms(s){
  s=s.replace(/\s+/g,"").replace(/[\u2212\u2013]/g,"-");
  if(!s)throw Error("Empty expression.");
  let a=[],cur="";
  for(let i=0;i<s.length;i++){
    let c=s[i];
    if((c==="+"||c==="-")&&i>0){
      if(!cur||cur==="+"||cur==="-")throw Error("Malformed expression.");
      a.push(cur);cur=c
    } else cur+=c
  }
  if(!cur||cur==="+"||cur==="-")throw Error("Malformed expression.");
  a.push(cur);return a
}
function parseSide(s){
  let c={x:R(0),y:R(0),z:R(0)},b=R(0);
  for(let t of terms(s)){
    let sign=1;
    if(t[0]==="-"){sign=-1;t=t.slice(1)} else if(t[0]==="+")t=t.slice(1);
    let vs=["x","y","z"].filter(v=>t.includes(v));
    if(vs.length>1)throw Error("Products such as xy are not linear.");
    if(vs.length){
      let v=vs[0],q=t.slice(0,-1);let k=q?num(q):R(1);
      c[v]=add(c[v],sign===1?k:neg(k))
    } else {
      let k=num(t);b=add(b,sign===1?k:neg(k))
    }
  }
  return {c,b}
}
function parse(s){
  if((s.match(/=/g)||[]).length!==1)throw Error("Each equation needs exactly one '='.");
  let [l,r]=s.split("=");
  let a=parseSide(l),b=parseSide(r);
  return {c:[sub(a.c.x,b.c.x),sub(a.c.y,b.c.y),sub(a.c.z,b.c.z)],b:sub(b.b,a.b)}
}
function matrixSolve(rows,n){
  let m=rows.map(r=>r.map(x=>R(x.n,x.d))),rank=0,piv=[];
  for(let col=0;col<n&&rank<m.length;col++){
    let p=m.findIndex((r,i)=>i>=rank&&!zero(r[col]));
    if(p<0)continue;
    [m[rank],m[p]]=[m[p],m[rank]];
    let q=m[rank][col];
    m[rank]=m[rank].map(x=>div(x,q));
    for(let i=0;i<m.length;i++)if(i!==rank&&!zero(m[i][col])){
      let f=m[i][col];
      m[i]=m[i].map((x,j)=>sub(x,mul(f,m[rank][j])))
    }
    piv.push(col);rank++
  }
  for(let r of m)if(r.slice(0,n).every(zero)&&!zero(r[n]))return {type:"none"};
  if(rank<n)return {type:"infinite"};
  let x=Array(n).fill(0).map(()=>R(0));
  piv.forEach((p,r)=>x[p]=m[r][n]);
  return {type:"unique",x}
}
function eqText(e,n=2){
  let vs=["x","y","z"].slice(0,n),out="";
  vs.forEach((v,i)=>{
    let c=e.c[i];if(zero(c))return;
    let negative=val(c)<0,m=negative?neg(c):c,coef=str(m)==="1"?"":fracHTML(m);
    out+=(out?(negative?" - ":" + "):(negative?"-":""))+coef+v
  });
  return (out||"0")+" = "+fracHTML(e.b)
}

/* ---- rendering ---- */
function renderInputs(){
  document.getElementById("inputHelp").textContent = `Use x and y${count===3?", z":""}. Fractions, decimals, and negative values are all fine.`;
  document.getElementById("inputs").innerHTML = equations.map((e,i)=>`
    <div class="field" style="animation-delay:${i*0.07}s">
      <label for="in${i}">Equation ${i+1}</label>
      <div class="rule-shell" id="shell${i}">
        <span class="rule-num">${i+1}</span>
        <input id="in${i}" value="${e.replaceAll('"',"&quot;")}" placeholder="${i?"x - y = 4":"2x + 3y = 7"}">
      </div>
      <span class="err-msg" id="err${i}" style="display:none"></span>
    </div>`).join("");
  equations.forEach((_,i)=>document.getElementById("in"+i).addEventListener("input", e=>equations[i]=e.target.value));
}

function renderExamples(){
  document.getElementById("examples").innerHTML = examples
    .map((e,idx)=>({e,idx}))
    .filter(({e})=>e[1]===count)
    .map(({e,idx})=>`
      <button class="example-card" data-ex="${idx}" type="button">
        <span class="ex-top"><span class="ex-title">${e[0]}</span></span>
        <span class="ex-desc">${e[3]}</span>
        <span class="ex-eq">${e[2].join(" &middot; ")}</span>
        <svg class="ex-arrow" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h9M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>`).join("");
  document.querySelectorAll(".example-card").forEach(b=>b.onclick=()=>{
    let e = examples[+b.dataset.ex];
    count = e[1]; equations = [...e[2]];
    setMode(); renderInputs();
    document.getElementById("inputs").scrollIntoView({behavior:"smooth", block:"center"});
  });
}

function setMode(){
  document.getElementById("twoBtn").classList.toggle("active", count===2);
  document.getElementById("threeBtn").classList.toggle("active", count===3);
  document.getElementById("segments").classList.toggle("on-three", count===3);
  renderExamples();
}

function reset(){
  equations = Array(count).fill("");
  document.getElementById("results").classList.remove("show");
  document.getElementById("generalErr").style.display = "none";
  document.getElementById("graphCard").style.display = "none";
  document.getElementById("graph").innerHTML = "";
  renderInputs();
}

function clearErrors(){
  equations.forEach((_,i)=>{
    document.getElementById("err"+i).style.display = "none";
    document.getElementById("shell"+i).classList.remove("error");
  });
  document.getElementById("generalErr").style.display = "none";
}

function solve(){
  clearErrors();
  let bad = false;
  equations.forEach((e,i)=>{
    if(!e.trim()){
      document.getElementById("err"+i).textContent = "Enter an equation.";
      document.getElementById("err"+i).style.display = "inline-block";
      document.getElementById("shell"+i).classList.add("error");
      bad = true;
    }
  });
  if(bad) return;

  let rows, n = count, s;
  try{
    rows = equations.map(parse);
    let matrix = rows.map(r=>[...r.c.slice(0,n), r.b]);
    s = matrixSolve(matrix, n);
  }catch(e){
    let g = document.getElementById("generalErr");
    g.textContent = e.message || "Could not understand the system.";
    g.style.display = "block";
    return;
  }

  // brief scribble animation before the reveal, purely for feel (the math above already ran)
  const btn = document.getElementById("solveBtn");
  btn.classList.add("solving");
  btn.innerHTML = `<span class="scribble"><svg viewBox="0 0 46 16"><path d="M2 8 Q 8 2, 14 8 T 26 8 T 38 8" stroke="#2A1D06" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg></span>Solve the system`;
  setTimeout(()=>{
    last = {rows, s};
    showResult(rows, s);
    btn.classList.remove("solving");
    btn.innerHTML = "Solve the system";
  }, 480);
}

function showResult(rows, s){
  let box = document.getElementById("solution"), v = ["x","y","z"].slice(0,count);
  if(s.type==="unique"){
    let mathText = v.map((x,i)=>x+" = "+fracHTML(s.x[i])).join("&emsp;");
    box.innerHTML = `<div class="solution-box">
      <div class="sol-icon" id="solIcon">&check;</div>
      <div>
        <span class="sol-tag">Unique solution</span>
        <h3>Here's your answer</h3>
        <div class="circle-answer">
          <div class="math-line">${mathText}</div>
          <svg class="circle-svg" viewBox="0 0 280 110"><path class="circle-path" d="M6 55 C 6 14, 274 14, 274 55 C 274 96, 6 96, 6 55" /></svg>
        </div>
        <div class="decimals">${v.map((x,i)=>`<span>${x} &approx; <b class="count" data-target="${val(s.x[i])}">0</b></span>`).join("")}</div>
      </div></div>`;
    renderSteps(rows, s);
    renderVerification(rows, s);
    renderGraph(rows, s);
    burstIcon(document.getElementById("solIcon"));
    document.querySelectorAll(".count").forEach(el=>animateCount(el, +el.dataset.target));
  } else if(s.type==="none"){
    box.innerHTML = `<div class="solution-box warn">
      <div class="sol-icon">&times;</div>
      <div><span class="sol-tag">Result</span><h3>No solution</h3>
      <p>These equations contradict each other. They can't all be true at once.</p></div></div>`;
    renderSteps(rows, s);
    renderGraph(rows, s);
    document.getElementById("verification").innerHTML = "";
    document.getElementById("verifySolution").innerHTML = "";
  } else {
    box.innerHTML = `<div class="solution-box info">
      <div class="sol-icon">&infin;</div>
      <div><span class="sol-tag">Result</span><h3>Infinitely many solutions</h3>
      <p>These equations depend on each other, so they don't pin down one single point.</p></div></div>`;
    renderSteps(rows, s);
    renderGraph(rows, s);
    document.getElementById("verification").innerHTML = "";
    document.getElementById("verifySolution").innerHTML = "";
  }
  document.getElementById("results").classList.add("show");
  setTimeout(()=>document.getElementById("results").scrollIntoView({behavior:"smooth", block:"start"}), 30);
}

function methodName(m){
  return ({substitution:"Substitution", elimination:"Elimination", cross:"Cross-multiplication", mixed:"Mixed methods", auto:"Smart mix"})[m] || m;
}

/* combine r1 and r2 so the variable at idx cancels: k1*r1 + k2*r2 */
function eliminateVar(r1, r2, idx){
  let k1 = neg(r2.c[idx]), k2 = r1.c[idx];
  let scaled1 = {c:r1.c.map(v=>mul(v,k1)), b:mul(r1.b,k1)};
  let scaled2 = {c:r2.c.map(v=>mul(v,k2)), b:mul(r2.b,k2)};
  let combined = {c:scaled1.c.map((v,i)=>add(v,scaled2.c[i])), b:add(scaled1.b,scaled2.b)};
  return {k1, k2, scaled1, scaled2, combined};
}

function renderSteps(rows, s){
  let selected = document.getElementById("method").value;
  let chosen = selected;
  if(selected==="auto"){
    chosen = count===2 ? (zero(rows[0].c[0]) || Math.abs(val(rows[0].c[0]))===1 ? "substitution" : "elimination") : "elimination";
  }
  if(selected==="cross" && count===3) chosen = "mixed";

  let stepsArr = [];
  stepsArr.push(`<h4><span class="method-tag">${methodName(chosen)}</span><br>Write the system</h4><p>Start with the equations exactly as entered, then arrange them so the chosen method is easy to follow.</p><div class="eq-box">${rows.map(r=>eqText(r,count)).join("\n")}</div>`);

  if(count===2){
    let a=rows[0], b=rows[1];
    if(chosen==="substitution"){
      let target = zero(a.c[0]) ? "x" : (!zero(a.c[1]) ? "y" : "x");
      let idx = target==="x" ? 0 : 1, otherIdx = idx===0?1:0, other = idx===0 ? "y" : "x";
      let c=a.c[idx], d=a.c[otherIdx];
      if(zero(c)){[a,b]=[b,a]; c=a.c[idx]; d=a.c[otherIdx]}
      let solved = div(a.b, c), coeff = neg(div(d,c));
      let coeffAbs = val(coeff)<0?neg(coeff):coeff;
      let coeffTerm = zero(coeff) ? "" : (val(coeff)<0?" &minus; ":" + ")+fracHTML(coeffAbs)+other;
      let solvedText = `${target} = ${fracHTML(solved)}${coeffTerm}`;
      stepsArr.push(`<h4>Isolate ${target}</h4><p>Rearrange <b>${eqText(a,2)}</b> so ${target} stands alone on one side.</p><div class="eq-box">${solvedText}</div>`);

      if(s.type==="unique"){
        let coefOnTarget = b.c[idx];
        let combinedCoeff = add(mul(coefOnTarget,coeff), b.c[otherIdx]);
        let rhs = sub(b.b, mul(coefOnTarget, solved));
        let otherVal = div(rhs, combinedCoeff);
        let targetVal = add(solved, mul(coeff, otherVal));
        let otherAbs = val(b.c[otherIdx])<0?neg(b.c[otherIdx]):b.c[otherIdx];
        stepsArr.push(`<h4>Substitute into the other equation</h4><p>Plug that expression for ${target} into <b>${eqText(b,2)}</b> and simplify.</p><div class="eq-box">${fracHTML(coefOnTarget)}(${fracHTML(solved)}${coeffTerm}) ${zero(b.c[otherIdx])?"":(val(b.c[otherIdx])<0?"&minus; ":"+ ")+fracHTML(otherAbs)+other} = ${fracHTML(b.b)}\n${fracHTML(combinedCoeff)}${other} = ${fracHTML(rhs)}\n${other} = ${fracHTML(otherVal)}</div>`);
        stepsArr.push(`<h4>Back-substitute for ${target}</h4><p>Put ${other} = ${fracHTML(otherVal)} back into the equation from step 2.</p><div class="eq-box">${target} = ${fracHTML(solved)}${coeffTerm.replace(other,`(${fracHTML(otherVal)})`)}\n${target} = ${fracHTML(targetVal)}</div>`);
      } else {
        stepsArr.push(`<h4>Classify the system</h4><p>${s.type==="none" ? "Substituting leads to a false statement, so no solution exists." : "Substituting leads to a statement that's always true, so infinitely many solutions exist."}</p>`);
      }
    } else if(chosen==="cross"){
      if(s.type==="unique"){
        let A=a.c[0],B=a.c[1],C=a.b,D=b.c[0],E=b.c[1],F=b.b;
        let den=sub(mul(A,E),mul(D,B));
        let x=div(sub(mul(C,E),mul(F,B)),den);
        let y=div(sub(mul(A,F),mul(D,C)),den);
        stepsArr.push(`<h4>Apply cross-multiplication</h4><p>For <b>ax + by = c</b> and <b>dx + ey = f</b>, use the cross-products to isolate each variable.</p><div class="eq-box">x = (ce &minus; fb) / (ae &minus; db)\ny = (af &minus; dc) / (ae &minus; db)</div>`);
        stepsArr.push(`<h4>Plug in the numbers</h4><p>Substitute a = ${fracHTML(A)}, b = ${fracHTML(B)}, c = ${fracHTML(C)}, d = ${fracHTML(D)}, e = ${fracHTML(E)}, f = ${fracHTML(F)}.</p><div class="eq-box">x = (${fracHTML(mul(C,E))} &minus; ${fracHTML(mul(F,B))}) / (${fracHTML(mul(A,E))} &minus; ${fracHTML(mul(D,B))})\ny = (${fracHTML(mul(A,F))} &minus; ${fracHTML(mul(D,C))}) / (${fracHTML(mul(A,E))} &minus; ${fracHTML(mul(D,B))})</div>`);
        stepsArr.push(`<h4>Simplify</h4><p>Reduce each fraction to its simplest form.</p><div class="eq-box">x = ${fracHTML(x)}\ny = ${fracHTML(y)}</div>`);
      } else {
        stepsArr.push(`<h4>Compare cross-products</h4><p>The cross-products show the system is ${s.type==="none"?"inconsistent":"dependent"}, so it doesn't produce one unique pair.</p>`);
      }
    } else if(chosen==="mixed"){
      let target = zero(a.c[0]) ? "x" : (!zero(a.c[1]) ? "y" : "x");
      let idx = target==="x" ? 0 : 1, otherIdx = idx===0?1:0, other = idx===0 ? "y" : "x";
      let c=a.c[idx], d=a.c[otherIdx];
      if(zero(c)){[a,b]=[b,a]; c=a.c[idx]; d=a.c[otherIdx]}
      let solved = div(a.b, c), coeff = neg(div(d,c));
      let coeffAbs = val(coeff)<0?neg(coeff):coeff;
      let coeffTerm = zero(coeff) ? "" : (val(coeff)<0?" &minus; ":" + ")+fracHTML(coeffAbs)+other;
      stepsArr.push(`<h4>Isolate ${target}</h4><p>Rearrange <b>${eqText(a,2)}</b> so ${target} stands alone.</p><div class="eq-box">${target} = ${fracHTML(solved)}${coeffTerm}</div>`);
      if(s.type==="unique"){
        let coefOnTarget = b.c[idx];
        let combinedCoeff = add(mul(coefOnTarget,coeff), b.c[otherIdx]);
        let rhs = sub(b.b, mul(coefOnTarget, solved));
        let otherVal = div(rhs, combinedCoeff);
        let targetVal = add(solved, mul(coeff, otherVal));
        stepsArr.push(`<h4>Eliminate ${target} from the other equation</h4><p>Substituting removes ${target}, leaving one equation in ${other} to solve directly.</p><div class="eq-box">${fracHTML(combinedCoeff)}${other} = ${fracHTML(rhs)}\n${other} = ${fracHTML(otherVal)}</div>`);
        stepsArr.push(`<h4>Back-substitute</h4><p>Put ${other} = ${fracHTML(otherVal)} back into the isolated equation.</p><div class="eq-box">${target} = ${fracHTML(targetVal)}</div>`);
      } else {
        stepsArr.push(`<h4>Classify the system</h4><p>${s.type==="none" ? "The reduced equation is a contradiction, so no solution exists." : "The reduced equation is always true, so infinitely many solutions exist."}</p>`);
      }
    } else {
      if(zero(a.c[0])) [a,b]=[b,a];
      let {k1,k2,scaled1,scaled2,combined} = eliminateVar(a,b,0);
      let trivial = val(k1)===1 && val(k2)===1;
      stepsArr.push(`<h4>Match the x-coefficients</h4><p>${trivial ? "The x-coefficients are already opposite, so adding the equations cancels x." : `Multiply so the x-terms become opposites: ${val(k1)===1?"keep the first equation":`&times; ${fracHTML(k1)} the first equation`}, ${val(k2)===1?"keep the second":`&times; ${fracHTML(k2)} the second`}.`}</p><div class="eq-box">${eqText(scaled1,2)}\n${eqText(scaled2,2)}</div>`);
      stepsArr.push(`<h4>Add the equations</h4><p>The x-terms cancel, leaving a single equation in y.</p><div class="eq-box">${eqText(combined,2)}</div>`);
      if(s.type==="unique"){
        let yVal = div(combined.b, combined.c[1]);
        stepsArr.push(`<h4>Solve for y</h4><p>Divide both sides by the y-coefficient.</p><div class="eq-box">y = ${fracHTML(combined.b)} / ${fracHTML(combined.c[1])}\ny = ${fracHTML(yVal)}</div>`);
        let xVal = div(sub(a.b, mul(a.c[1], yVal)), a.c[0]);
        stepsArr.push(`<h4>Back-substitute for x</h4><p>Put y = ${fracHTML(yVal)} into <b>${eqText(a,2)}</b> and solve for x.</p><div class="eq-box">${fracHTML(a.c[0])}x + ${fracHTML(a.c[1])}(${fracHTML(yVal)}) = ${fracHTML(a.b)}\nx = ${fracHTML(xVal)}</div>`);
      } else {
        stepsArr.push(`<h4>Classify the system</h4><p>${s.type==="none" ? `This reduces to a false statement (<b>${eqText(combined,2)}</b>), so no pair satisfies both equations.` : `This reduces to a statement that's always true (<b>${eqText(combined,2)}</b>), so the equations describe the same line.`}</p>`);
      }
    }
  } else {
    let rr = rows.slice();
    if(zero(rr[0].c[2])){ let i=rr.findIndex(r=>!zero(r.c[2])); if(i>0)[rr[0],rr[i]]=[rr[i],rr[0]]; }
    let [q1,q2,q3] = rr;
    let e1 = eliminateVar(q1,q2,2), e2 = eliminateVar(q1,q3,2);
    let p = e1.combined, q = e2.combined;
    stepsArr.push(`<h4>Eliminate z, first pair</h4><p>Combine equations 1 and 2 so the z-terms cancel.</p><div class="eq-box">${eqText(e1.scaled1,3)}\n${eqText(e1.scaled2,3)}\n&darr;\n${eqText(p,3)}</div>`);
    stepsArr.push(`<h4>Eliminate z, second pair</h4><p>Combine equations 1 and 3 the same way.</p><div class="eq-box">${eqText(e2.scaled1,3)}\n${eqText(e2.scaled2,3)}\n&darr;\n${eqText(q,3)}</div>`);
    stepsArr.push(`<h4>Reduce to two variables</h4><p>Both results only involve x and y &mdash; a smaller system to solve.</p><div class="eq-box">${eqText(p,2)}\n${eqText(q,2)}</div>`);

    if(zero(p.c[0])) [p,q]=[q,p];
    let e3 = eliminateVar(p,q,0);
    let combinedXY = e3.combined;
    if(s.type==="unique"){
      let yVal = div(combinedXY.b, combinedXY.c[1]);
      let xVal = div(sub(p.b, mul(p.c[1], yVal)), p.c[0]);
      stepsArr.push(`<h4>Solve the reduced system</h4><p>Eliminate x between those two equations, then solve for y and back-substitute for x.</p><div class="eq-box">${eqText(combinedXY,2)}\ny = ${fracHTML(yVal)}\nx = ${fracHTML(xVal)}</div>`);
      let zVal = div(sub(q1.b, add(mul(q1.c[0],xVal), mul(q1.c[1],yVal))), q1.c[2]);
      stepsArr.push(`<h4>Back-substitute for z</h4><p>Put x = ${fracHTML(xVal)} and y = ${fracHTML(yVal)} into <b>${eqText(q1,3)}</b>.</p><div class="eq-box">${fracHTML(q1.c[2])}z = ${fracHTML(sub(q1.b, add(mul(q1.c[0],xVal), mul(q1.c[1],yVal))))}\nz = ${fracHTML(zVal)}</div>`);
    } else {
      stepsArr.push(`<h4>Classify the result</h4><p>${s.type==="none" ? `Reducing the system leads to a false statement (<b>${eqText(combinedXY,2)}</b>), so there's no solution.` : `Reducing the system leads to a statement that's always true (<b>${eqText(combinedXY,2)}</b>), so infinitely many solutions exist.`}</p>`);
    }
  }

  document.getElementById("steps").innerHTML = stepsArr.map((body,i)=>`
    <div class="step-row" style="animation-delay:${i*0.09+0.05}s">
      <div class="step-num">${i+1}</div>
      <div>${body}</div>
    </div>`).join("");

  document.getElementById("methodNoteTitle").textContent = "Method: " + methodName(chosen).toLowerCase();
  const notes = {
    substitution:"Isolate one variable, substitute it into the other equation, then back-substitute.",
    elimination:"Combine equations to cancel a variable, reduce the system, and back-substitute.",
    cross:"For two variables, cross-products give x and y directly, no substitution needed.",
    mixed:"Substitution simplifies first, then elimination finishes the job.",
  };
  document.getElementById("methodNoteBody").textContent = notes[chosen] || notes.elimination;
}

function subText(r, s, n){
  let vs = ["x","y","z"].slice(0,n), out = "";
  vs.forEach((v,j)=>{
    let c = r.c[j];
    if(zero(c)) return;
    let negative = val(c)<0, m = negative?neg(c):c;
    let coefStr = str(m)==="1" ? "" : fracHTML(m);
    let term = coefStr + "(" + fracHTML(s.x[j]) + ")";
    out += (out ? (negative?" - ":" + ") : (negative?"-":"")) + term;
  });
  return out || "0";
}

function renderVerification(rows, s){
  if(s.type!=="unique"){
    document.getElementById("verifySolution").innerHTML = "";
    return;
  }
  let vs = ["x","y","z"].slice(0,count);
  document.getElementById("verifySolution").innerHTML = `
    <div class="verify-solution">
      <span class="verify-solution-label">Solution used below:</span>
      ${vs.map((v,i)=>`<span class="verify-solution-chip">${v} = ${fracHTML(s.x[i])}</span>`).join("")}
    </div>`;
  document.getElementById("verification").innerHTML = rows.map((r,i)=>{
    let left = R(0);
    for(let j=0;j<count;j++) left = add(left, mul(r.c[j], s.x[j]));
    return `<div class="verify-row" style="animation-delay:${i*0.09+0.05}s">
      <span class="ok"><svg class="check-svg" width="16" height="16" viewBox="0 0 16 16"><path d="M2 8 L6 12 L14 3" stroke="#2F5D42" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>Equation ${i+1} checks out</span>
      <span class="val">${subText(r,s,count)} = ${fracHTML(left)}</span>
    </div>`;
  }).join("");
}

/* ---- graph: plot a 2-variable system so the intersection is visible ---- */
function lineEndpoints(row, reach){
  // row.c[0]*x + row.c[1]*y = row.b, in math space, returns two far-apart points
  const c0 = val(row.c[0]), c1 = val(row.c[1]), b = val(row.b);
  if(Math.abs(c1) > 1e-9){
    const x1 = -reach, x2 = reach;
    return [[x1, (b - c0*x1)/c1], [x2, (b - c0*x2)/c1]];
  }
  if(Math.abs(c0) > 1e-9){
    const x = b / c0;
    return [[x, -reach], [x, reach]];
  }
  return [[-reach,0],[reach,0]];
}

function renderGraph(rows, s){
  const card = document.getElementById("graphCard");
  const host = document.getElementById("graph");
  if(count !== 2){ card.style.display = "none"; host.innerHTML = ""; return; }
  card.style.display = "block";

  const size = 300, cx = size/2, cy = size/2, pad = 16;
  let magnitudes = [1];
  rows.forEach(r=>{
    [0,1].forEach(i=>{ if(!zero(r.c[i])) magnitudes.push(Math.abs(val(r.b)/val(r.c[i]))); });
  });
  if(s.type==="unique") s.x.forEach(x=>magnitudes.push(Math.abs(val(x))));
  let range = Math.max(5, Math.min(40, Math.ceil(Math.max(...magnitudes) * 1.35)));
  const scale = (cx - pad) / range;
  const toX = mx => cx + mx*scale;
  const toY = my => cy - my*scale;

  const colors = ["#2F5D42", "#B87F22"];
  const reach = range * 1.4;
  let linesSvg = rows.map((r,i)=>{
    const [[x1,y1],[x2,y2]] = lineEndpoints(r, reach);
    return `<line class="graph-line ${i===0?"a":"b"}" x1="${toX(x1).toFixed(1)}" y1="${toY(y1).toFixed(1)}" x2="${toX(x2).toFixed(1)}" y2="${toY(y2).toFixed(1)}" stroke="${colors[i]}" stroke-width="2.6"/>`;
  }).join("");

  let pointSvg = "";
  if(s.type==="unique"){
    const px = toX(val(s.x[0])), py = toY(val(s.x[1]));
    pointSvg = `
      <circle class="graph-point-ring" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="7"/>
      <g class="graph-point">
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5.5" fill="var(--ochre)" stroke="var(--ink)" stroke-width="1.6"/>
      </g>`;
  }

  const svg = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Graph of the two lines">
    <line class="graph-axis" x1="${pad}" y1="${cy}" x2="${size-pad}" y2="${cy}"/>
    <line class="graph-axis" x1="${cx}" y1="${pad}" x2="${cx}" y2="${size-pad}"/>
    ${linesSvg}
    ${pointSvg}
  </svg>`;

  const rowText = (r,i)=>`<div class="graph-legend-row"><span class="graph-legend-swatch" style="border-color:${colors[i]}"></span><span class="graph-legend-eq">${eqText(r,2)}</span></div>`;

  let note;
  if(s.type==="unique"){
    note = `The lines cross at exactly one point &mdash; <b>x = ${str(s.x[0])}, y = ${str(s.x[1])}</b>. That crossing is the only pair that satisfies both equations at once.`;
  } else if(s.type==="none"){
    note = `The lines run <b>parallel</b> and never touch, which is the geometric picture of "no solution."`;
  } else {
    note = `Both equations draw the <b>same line</b>, so every point on it is a valid solution.`;
  }

  host.innerHTML = `<div class="graph-wrap">
    <div class="graph-svg-shell">${svg}</div>
    <div class="graph-legend">
      ${rows.map(rowText).join("")}
      <div class="graph-note">${note}</div>
    </div>
  </div>`;
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function burstIcon(el){
  if(!el || prefersReducedMotion) return;
  for(let i=0;i<8;i++){
    let angle = (i/8) * Math.PI * 2;
    let dist = 26 + Math.random()*10;
    let dot = document.createElement("span");
    dot.className = "burst-dot";
    dot.style.setProperty("--dx", (Math.cos(angle)*dist)+"px");
    dot.style.setProperty("--dy", (Math.sin(angle)*dist)+"px");
    dot.style.animationDelay = (i*0.02)+"s";
    el.appendChild(dot);
    setTimeout(()=>dot.remove(), 800);
  }
}

function animateCount(el, target){
  if(prefersReducedMotion){ el.textContent = target.toFixed(6); return; }
  let start = performance.now(), dur = 650;
  function tick(now){
    let p = Math.min((now-start)/dur, 1);
    let eased = 1 - Math.pow(1-p, 3);
    el.textContent = (target*eased).toFixed(6);
    if(p<1) requestAnimationFrame(tick); else el.textContent = target.toFixed(6);
  }
  requestAnimationFrame(tick);
}

/* subtle cursor-tilt on the hero doodle card, desktop only */
(function(){
  if(prefersReducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const wrap = document.querySelector(".doodle-wrap");
  const card = document.querySelector(".doodle-card");
  if(!wrap || !card) return;
  wrap.addEventListener("mousemove", e=>{
    const r = wrap.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.classList.add("tilting");
    card.style.transform = `perspective(700px) rotateX(${(-py*10).toFixed(2)}deg) rotateY(${(px*12).toFixed(2)}deg) rotate(-1.4deg)`;
  });
  wrap.addEventListener("mouseleave", ()=>{
    card.classList.remove("tilting");
    card.style.transform = "rotate(-1.4deg)";
  });
})();

/* shrink + shadow the header once the page scrolls */
(function(){
  const header = document.querySelector(".site-header");
  if(!header) return;
  let ticking = false;
  function update(){
    header.classList.toggle("scrolled", window.scrollY > 8);
    ticking = false;
  }
  window.addEventListener("scroll", ()=>{
    if(!ticking){ requestAnimationFrame(update); ticking = true; }
  }, {passive:true});
  update();
})();

/* cursor-tracked spotlight glow on cards, desktop hover-capable only */
(function(){
  if(prefersReducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const targets = document.querySelectorAll(".card, .example-card");
  targets.forEach(el=>{
    el.addEventListener("mouseenter", ()=>el.classList.add("glow-active"));
    el.addEventListener("mouseleave", ()=>el.classList.remove("glow-active"));
    el.addEventListener("mousemove", e=>{
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", ((e.clientX - r.left)/r.width*100).toFixed(1)+"%");
      el.style.setProperty("--my", ((e.clientY - r.top)/r.height*100).toFixed(1)+"%");
    });
  });
})();

/* reveal cards as they scroll into view */
(function(){
  const targets = document.querySelectorAll(".reveal-on-scroll");
  if(!targets.length) return;
  if(prefersReducedMotion || !("IntersectionObserver" in window)){
    targets.forEach(t=>t.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, {threshold:0.15});
  targets.forEach(t=>io.observe(t));
})();

/* ---- wiring ---- */
document.getElementById("twoBtn").onclick = ()=>{count=2; equations=["",""]; setMode(); renderInputs(); reset()};
document.getElementById("threeBtn").onclick = ()=>{count=3; equations=["","",""]; setMode(); renderInputs(); reset()};
document.getElementById("solveBtn").onclick = solve;
document.getElementById("clearBtn").onclick = reset;
document.getElementById("resetBtn").onclick = reset;
document.getElementById("copyBtn").onclick = async ()=>{
  if(!last) return;
  let t = last.s.type==="unique"
    ? last.s.x.map((x,i)=>`${["x","y","z"][i]} = ${str(x)}`).join("\n")
    : last.s.type==="none" ? "No solution." : "Infinitely many solutions.";
  try{
    await navigator.clipboard.writeText(t);
    let btn = document.getElementById("copyBtn");
    btn.classList.add("copied");
    btn.textContent = "Copied \u2713";
    setTimeout(()=>{ btn.classList.remove("copied"); btn.textContent = "Copy solution"; }, 1300);
  }catch{}
};
document.getElementById("method").onchange = ()=>{
  const d = {
    auto:"The solver picks a clean route and explains why each move is used.",
    substitution:"Isolate one variable, substitute it into another equation, then back-substitute.",
    elimination:"Multiply and combine equations to cancel a variable, then solve the reduced system.",
    cross:"For two variables, use cross-products to calculate x and y directly.",
    mixed:"Combine substitution and elimination where it makes the algebra shorter and clearer."
  };
  document.getElementById("methodDesc").textContent = d[document.getElementById("method").value];
};

/* ---- custom animated method dropdown, backed by the hidden native <select> ---- */
(function initMethodDropdown(){
  const select = document.getElementById("method");
  const wrap = document.getElementById("methodDropdown");
  const trigger = document.getElementById("methodTrigger");
  const triggerText = document.getElementById("methodTriggerText");
  const listbox = document.getElementById("methodListbox");
  if(!select || !wrap || !trigger || !listbox) return;

  const subs = {
    auto:"Best fit for this system",
    substitution:"Isolate, then replace",
    elimination:"Cancel a variable",
    cross:"Direct formula, 2-var only",
    mixed:"Combine both techniques"
  };

  const opts = [...select.options].map(o=>({value:o.value, label:o.textContent.replace(/\s*\(.*\)$/,""), sub: subs[o.value] || ""}));

  function buildOptions(){
    listbox.innerHTML = opts.map((o,i)=>`
      <li class="method-option${o.value===select.value?" selected":""}" role="option" id="methodOpt-${o.value}"
          data-value="${o.value}" aria-selected="${o.value===select.value}" tabindex="-1" style="animation-delay:${i*0.035}s">
        <span class="opt-check"><svg viewBox="0 0 10 10"><path d="M1 5l2.6 2.6L9 2" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span class="method-option-copy">
          <span class="method-option-title">${o.label}</span>
          ${o.sub?`<span class="method-option-sub">${o.sub}</span>`:""}
        </span>
      </li>`).join("");
  }

  function syncTrigger(){
    const cur = opts.find(o=>o.value===select.value) || opts[0];
    triggerText.textContent = cur.label;
    listbox.querySelectorAll(".method-option").forEach(li=>{
      const active = li.dataset.value === select.value;
      li.classList.toggle("selected", active);
      li.setAttribute("aria-selected", active);
    });
  }

  let open = false, focusIndex = -1;
  function optionEls(){ return [...listbox.querySelectorAll(".method-option")]; }

  function openList(){
    if(open) return;
    open = true;
    wrap.classList.add("open");
    trigger.setAttribute("aria-expanded","true");
    focusIndex = opts.findIndex(o=>o.value===select.value);
    setFocus(focusIndex, false);
  }
  function closeList(returnFocus){
    if(!open) return;
    open = false;
    wrap.classList.remove("open");
    trigger.setAttribute("aria-expanded","false");
    optionEls().forEach(li=>li.classList.remove("focused"));
    if(returnFocus) trigger.focus();
  }
  function setFocus(i, scroll){
    const els = optionEls();
    if(!els.length) return;
    focusIndex = (i+els.length) % els.length;
    els.forEach(li=>li.classList.remove("focused"));
    els[focusIndex].classList.add("focused");
    if(scroll !== false) els[focusIndex].scrollIntoView({block:"nearest"});
  }
  function choose(value){
    if(select.value !== value){
      select.value = value;
      select.dispatchEvent(new Event("change", {bubbles:true}));
    }
    syncTrigger();
    closeList(true);
  }

  trigger.addEventListener("click", ()=> open ? closeList(false) : openList());
  trigger.addEventListener("keydown", e=>{
    if(["ArrowDown","ArrowUp","Enter"," "].includes(e.key)){
      e.preventDefault();
      if(!open){ openList(); return; }
    }
    if(open){
      if(e.key==="ArrowDown") setFocus(focusIndex+1);
      else if(e.key==="ArrowUp") setFocus(focusIndex-1);
      else if(e.key==="Escape") closeList(true);
    }
  });
  listbox.addEventListener("click", e=>{
    const li = e.target.closest(".method-option");
    if(li) choose(li.dataset.value);
  });
  listbox.addEventListener("keydown", e=>{
    if(e.key==="Enter" || e.key===" "){ e.preventDefault(); const els=optionEls(); if(els[focusIndex]) choose(els[focusIndex].dataset.value); }
    else if(e.key==="ArrowDown"){ e.preventDefault(); setFocus(focusIndex+1); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setFocus(focusIndex-1); }
    else if(e.key==="Escape"){ closeList(true); }
  });
  document.addEventListener("click", e=>{
    if(open && !wrap.contains(e.target)) closeList(false);
  });

  buildOptions();
  syncTrigger();
})();

renderInputs();
renderExamples();
