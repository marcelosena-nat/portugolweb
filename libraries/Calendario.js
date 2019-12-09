class Calendario {
	constructor() {
		this.DIA_DOMINGO = 1;
		this.DIA_SEGUNDA_FEIRA = 2;
		this.DIA_TERÇA_FEIRA = 3;
		this.DIA_QUARTA_FEIRA = 4;
		this.DIA_QUINTA_FEIRA = 5;
		this.DIA_SEXTA_FEIRA = 6;
		this.DIA_SABADO = 7;
		
		this.MES_JANEIRO = 1;
		this.MES_FEVEREIRO = 2;
		this.MES_MARCO = 3;
		this.MES_ABRIL = 4;
		this.MES_MAIO = 5;
		this.MES_JUNHO = 6;
		this.MES_JULHO = 7;
		this.MES_AGOSTO = 8;
		this.MES_SETEMBRO = 9;
		this.MES_OUTUBRO = 10;
		this.MES_NOVEMBRO = 11;
		this.MES_DEZEMBRO = 12;
		
		
		this.members = {
		"DIA_DOMINGO":{id:T_word,type:T_inteiro},
		"DIA_SEGUNDA_FEIRA":{id:T_word,type:T_inteiro},
		"DIA_TERÇA_FEIRA":{id:T_word,type:T_inteiro},
		"DIA_QUARTA_FEIRA":{id:T_word,type:T_inteiro},
		"DIA_QUINTA_FEIRA":{id:T_word,type:T_inteiro},
		"DIA_SEXTA_FEIRA":{id:T_word,type:T_inteiro},
		"DIA_SABADO":{id:T_word,type:T_inteiro},
		
		"MES_JANEIRO":{id:T_word,type:T_inteiro},
		"MES_FEVEREIRO":{id:T_word,type:T_inteiro},
		"MES_MARCO":{id:T_word,type:T_inteiro},
		"MES_ABRIL":{id:T_word,type:T_inteiro},
		"MES_MAIO":{id:T_word,type:T_inteiro},
		"MES_JUNHO":{id:T_word,type:T_inteiro},
		"MES_JULHO":{id:T_word,type:T_inteiro},
		"MES_AGOSTO":{id:T_word,type:T_inteiro},
		"MES_SETEMBRO":{id:T_word,type:T_inteiro},
		"MES_OUTUBRO":{id:T_word,type:T_inteiro},
		"MES_NOVEMBRO":{id:T_word,type:T_inteiro},
		"MES_DEZEMBRO":{id:T_word,type:T_inteiro},
		"ano_atual":{id:T_parO,parameters:[],type:T_inteiro},
		"mes_atual":{id:T_parO,parameters:[],type:T_inteiro},
		"dia_mes_atual":{id:T_parO,parameters:[],type:T_inteiro},
		"dia_semana_abreviado":{id:T_parO,parameters:[T_inteiro,T_logico,T_logico],type:T_inteiro},
		"dia_semana_atual":{id:T_parO,parameters:[],type:T_inteiro},
		"dia_semana_completo":{id:T_parO,parameters:[T_inteiro,T_logico,T_logico],type:T_inteiro},
		"dia_semana_curto":{id:T_parO,parameters:[T_inteiro,T_logico,T_logico],type:T_inteiro},
		"hora_atual":{id:T_parO,parameters:[T_logico],type:T_inteiro},		
		"minuto_atual":{id:T_parO,parameters:[],type:T_inteiro},
		"segundo_atual":{id:T_parO,parameters:[],type:T_inteiro},
		"milisegundo_atual":{id:T_parO,parameters:[],type:T_inteiro}
		};
		
		this.diasCompleto = [
		"Domingo",
		"Segunda-Feira",
		"Terça-Feira",
		"Quarta-Feira",
		"Quinta-Feira",
		"Sexta-Feira",
		"Sábado",
		];
		
		this.diasCurto = [
		"Domingo",
		"Segunda",
		"Terça",
		"Quarta",
		"Quinta",
		"Sexta",
		"Sábado",
		];
		
		this.diasAbr = [
		"Dom",
		"Seg",
		"Ter",
		"Qua",
		"Qui",
		"Sex",
		"Sáb",
		];
	}
	
	resetar()
	{
	}
	
	dia_semana_completo(dia,maiusculas,minusculas)
	{
		return {value:maiusculas == 0 ? this.diasCompleto[dia-1].toUpperCase() : ( 
		minusculas == 0 ? this.diasCompleto[dia-1].toLowerCase() : this.diasCompleto[dia-1]
		)};
	}
	
	dia_semana_curto(dia,maiusculas,minusculas)
	{
		return {value:maiusculas == 0 ? this.diasCurto[dia-1].toUpperCase() : ( 
		minusculas == 0 ? this.diasCurto[dia-1].toLowerCase() : this.diasCurto[dia-1]
		)};
	}
	
	dia_semana_abreviado(dia,maiusculas,minusculas)
	{
		return {value:maiusculas == 0 ? this.diasAbr[dia-1].toUpperCase() : ( 
		minusculas == 0 ? this.diasAbr[dia-1].toLowerCase() : this.diasAbr[dia-1]
		)};
	}
	
	milisegundo_atual()
	{
		return {value:new Date().getMilliseconds()+1}; 
	}
	
	segundo_atual()
	{
		return {value:new Date().getSeconds()+1}; 
	}
	
	minuto_atual()
	{
		return {value:new Date().getMinutes()+1}; 
	}
	
	hora_atual()
	{
		return {value:new Date().getHours()+1};		
	}
	
	dia_semana_atual()
	{
		return {value:new Date().getDay()+1}; 
	}
	
	dia_mes_atual()
	{
		return {value:new Date().getDate()}; 
	}
	
	mes_atual()
	{
		return {value:new Date().getMonth()+1};
	}
	
	ano_atual()
	{
		return {value:new Date().getFullYear()};
	}
}
