let webData=null;

async function load(){
    const r=await fetch("data/web_data.json?v="+Date.now());
    webData=await r.json();

    initTargets();
    render();
}

function initTargets(){
    const sel=document.getElementById("lotseSelect");
    sel.innerHTML="";

    webData.targets.forEach(t=>{
        const o=document.createElement("option");
        o.value=t;
        o.textContent=t;
        sel.appendChild(o);
    });

    const saved=localStorage.getItem("target");
    if(saved) sel.value=saved;

    sel.onchange=()=>{
        localStorage.setItem("target",sel.value);
        render();
    };
}

function render(){
    const view=document.getElementById("viewSelect").value;
    const target=document.getElementById("lotseSelect").value;
    const c=document.getElementById("content");

    if(view==="kanal"){
        c.innerHTML="<pre>"+JSON.stringify(webData.kanal,null,2)+"</pre>";
        return;
    }

    if(view==="gesamtboert"){
        c.innerHTML="<pre>"+JSON.stringify(webData.gesamtboert,null,2)+"</pre>";
        return;
    }

    if(view==="seelotsen"){
        c.innerHTML="<pre>"+JSON.stringify(webData.seelotsen,null,2)+"</pre>";
        return;
    }

    if(view==="graph"){
        c.innerHTML="<pre>"+JSON.stringify(webData.start_work_targets_history,null,2)+"</pre>";
        return;
    }
}

document.getElementById("viewSelect").onchange=render;

setInterval(load,120000);
load();