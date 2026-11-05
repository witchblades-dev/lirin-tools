importScripts('./solver.js');
onmessage=e=>{try{postMessage({result:solve(e.data)})}catch(err){postMessage({error:err.message})}};
