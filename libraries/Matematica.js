class Matematica {

	constructor() {
		this.PI = 3.141592653589793;
		
		this.members = {
		"PI":{id:T_word,type:T_real},
		"potencia":{id:T_parO,parameters:[T_real,T_real],type:T_real,jsSafe:true},
		"arredondar":{id:T_parO,parameters:[T_real,T_real],type:T_real,jsSafe:true},
		"cosseno":{id:T_parO,parameters:[T_real],type:T_real,jsSafe:true},
		"logaritmo":{id:T_parO,parameters:[T_real,T_real],type:T_real,jsSafe:true},
		"maior_numero":{id:T_parO,parameters:[T_real,T_real],type:T_real,jsSafe:true},
		"menor_numero":{id:T_parO,parameters:[T_real,T_real],type:T_real,jsSafe:true},
		"raiz":{id:T_parO,parameters:[T_real,T_real],type:T_real,jsSafe:true},
		"seno":{id:T_parO,parameters:[T_real],type:T_real,jsSafe:true},
		"tangente":{id:T_parO,parameters:[T_real],type:T_real,jsSafe:true},
		"valor_absoluto":{id:T_parO,parameters:[T_real],type:T_real,jsSafe:true}
		};
	}
	
	resetar()
	{
	}
	
	arredondar(numero,casas)
	{
	    return {value:(+numero.toFixed(casas))};
	}
	
	potencia(base,expoente)
	{
		return {value:Math.pow(base, expoente)};
	}
	
	cosseno(n)
	{
		return {value:Math.cos(n)};
	}
	
	logaritmo(numero,base)
	{
		return {value:Math.log(numero) / Math.log(base)};
	}
	
	maior_numero(a,b)
	{
		return {value:a > b ? a : b};
	}
	
	menor_numero(a,b)
	{
		return {value:a < b ? a : b};
	}
	
	raiz(x,n)
	{
	   try {
		var negate = n % 2 == 1 && x < 0;
		if(negate)
		  x = -x;
		var possible = Math.pow(x, 1 / n);
		n = Math.pow(possible, n);
		if(Math.abs(x - n) < 1 && (x > 0 == n > 0))
		  return {value:negate ? -possible : possible};
	  } catch(e){}
	}
	
	seno(n)
	{
		return {value:Math.sin(n)};
	}
	
	tangente(n)
	{
		return {value:Math.tan(n)};
	}
	
	valor_absoluto(n)
	{
		return {value:Math.abs(n)};
	}
}
