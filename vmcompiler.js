class Scope {
	constructor(parentScope,globalScope) {
		this.parentScope = parentScope;
		this.vars = {};
		if(globalScope)
			this.globalScope = globalScope;
		else
			this.globalScope = false;
		if(parentScope)
			this.varCount = parentScope.varCount;
		else
			this.varCount = 0;
	}
	
	createVar(varName,v)
	{
		this.vars[varName] = v;
		this.varCount++;
	}
	
	getVar(varName)
	{
		var v = this.vars[varName];
		if(!v && this.parentScope)
		{
			v = this.parentScope.getVar(varName);
		}
		
		return v;
	}
	
}
// http://blog.jamesdbloom.com/JavaCodeToByteCode_PartOne.html
class Compiler {
    constructor(codeTree,tokens,textInput,saida_div) {
		this.codeTree = codeTree;
		this.tokens = tokens;
		this.textInput = textInput;
		
		
		this.saida = "";
		this.saida_div = saida_div;
		
		this.functions = [];
		this.scope = false;
	}
	
	erro(msg)
	{	
		enviarErro(this.textInput,{index:this.lastIndex},msg);
	}
	
	getFuncIndex(name)
	{
		for(var i=0;i<this.functions.length;i++)
		{
			if(this.functions[i].name == name) return i;
		}
		this.erro("a função '"+name+"' não foi encontrada");
		return 0;
	}
	
	compile()
	{
		var funcoes = this.codeTree.funcoes;
		var variaveisGlobais = this.codeTree.variaveis;
		this.functions = [
		{
			name:"$undefined",bytecode:[] // para ignorar chamadas a funcoes que nao existem
		},
		{
			name:"escreva",
			bytecode:[
			B_LOAD,0,
			B_WRITE
			]
		},
		{
			name:"limpa",
			bytecode:[
			B_PUSH,"\n-------------------------------\n",B_WRITE,
			B_PUSH,"|    NÃO DEU PARA  LIMPAR     |\n",B_WRITE,
			B_PUSH,"|    ESQUECI O DETERGENTE     |\n",B_WRITE,
			B_PUSH,"-------------------------------\n",B_WRITE
			]
		},
		{
			name:"leia$inteiro",bytecode:[B_WAITINPUT,B_READ_INT,B_RETVALUE]
		},
		{
			name:"leia$real",bytecode:[B_WAITINPUT,B_READ_FLOAT,B_RETVALUE]
		},
		{
			name:"leia$cadeia",bytecode:[B_WAITINPUT,B_READ_STRING,B_RETVALUE]
		},
		{
			name:"leia$caracter",bytecode:[B_WAITINPUT,B_READ_CHAR,B_RETVALUE]
		},
		{
			name:"leia$logico",bytecode:[B_WAITINPUT,B_READ_BOOL,B_RETVALUE]
		}
		];
		
		
		this.scope = new Scope(this.scope,true); // cria um scopo para as variaveis globais
		
		var funcInit = {name:"#globalInit",bytecode:[],bytecodeIndexes:{} };
		this.compileStatements(variaveisGlobais,funcInit);
		this.functions.push(funcInit);
		
		var FuncOff = this.functions.length;
		
		for(var i=0;i<funcoes.length;i++)
		{
			this.functions.push({name:funcoes[i].name,bytecode:[],bytecodeIndexes:{} });
		}
		for(var i=0;i<funcoes.length;i++)
		{
			
			this.compileStatements(funcoes[i].statements,this.functions[FuncOff+i]);//,this.functions[FuncOff+i].bytecode,this.functions[FuncOff+i].variableMap);
			
		}
		
		funcInit.bytecode.push(B_INVOKE);
		var funcIndex = this.getFuncIndex("inicio");
		funcInit.bytecode.push(funcIndex);
		funcInit.bytecode.push(0); // nenhum argumento
		
		this.scope = this.scope.parentScope; // volta.
		
		console.log(this.functions);
		//if(!funcaoInicio) this.erro(this.tokens[0],"não encontrou a função início");
	}
	
	replaceAllBy(bc,indexes,value)
	{
		for(var i=0;i<indexes.length;i++)
		{
			bc[indexes[i]] = value;
		}
	}
	
	createVar(varName,type,isConst)
	{
		var v = this.scope.getVar(varName);
		if(v)
		{
			this.erro("a variável '"+varName+"' já foi declarada");
			return v;
		}
		else
		{
			v = {type:type,name:varName,index:this.scope.varCount,global:this.scope.globalScope,isConst:isConst};
			this.scope.createVar(varName,v);
			return v;
		}
	}
	
	getVar(varName)
	{
		//var v = this.vars[varName];
		var v = this.scope.getVar(varName);
		if(v)
		{
			return v;
		}
		else
		{
			this.erro("não encontrou a variável '"+varName+"', esqueceu de declará-la?");
			var v = this.createVar(varName,T_cadeia,false);
			return v;
		}
	}
	
	compileStatements(statements,func)
	{
		//,this.functions[FuncOff+i].bytecode,this.functions[FuncOff+i].variableMap);
		var bc = func.bytecode;
		//var variableMap = func.variableMap;
		var bcIndex = func.bytecodeIndexes;
		for(var i=0;i<statements.length;i++)
		{
			var stat = statements[i];
			this.lastIndex = stat.index;
			
			bcIndex[bc.length] = this.lastIndex;
			switch(stat.id)
			{
				case STATEMENT_declVar:
					var v = this.createVar(stat.name,stat.type,stat.isConst);
					if(stat.expr)
					{
						var tExpr = this.compileExpr(stat.expr,bc,stat.type);
						this.tryConvertType(v.type,tExpr,bc);
						bc.push(v.global ? B_STOREGLOBAL : B_STORE);
						bc.push(v.index);
					}
				break;
				case STATEMENT_expr:
					if(!isAttribOp(stat.expr.op) 
					&& stat.expr.op != T_autoinc
					&& stat.expr.op != T_autodec
					&& stat.expr.op != T_parO)
					{
						this.erro("Esta expressão não pode ficar sozinha, talvez tenha esquecido um operador matemático");
					}
					var tipoRet = this.compileExpr(stat.expr,bc,-1);
					if(tipoRet != T_vazio) bc.push(B_POP); // para não encher a stack com coisa inútil
				break;
				case STATEMENT_block:
					this.scope = new Scope(this.scope); // cria um scopo para rodar a funcao, se, enquanto e qualquer coisa...
						this.compileStatements(stat.statements,func);
					this.scope = this.scope.parentScope;
				break;
				case STATEMENT_se:
					//var trueJumps = [];
					var falseJumps = [];
					this.compileLogicalExpr(stat.expr,bc,false,falseJumps);
					
					//bc.push(B_IFEQ);
					//var jumpTrueIndex = bc.length;
					//bc.push(0);
					//this.replaceAllBy(bc,trueJumps,bc.length); // determina o inicio do bloco true
					this.compileStatements(stat.statements_true,func);
					
					
					if(stat.statements_false)
					{
						bc.push(B_GOTO);
						var jumpFalseIndex = bc.length;
						bc.push(0);
						//bc[jumpTrueIndex] = bc.length; // ajusta o index de onde acaba o True Block
						this.replaceAllBy(bc,falseJumps,bc.length); // determina o inicio do bloco false
						
						this.compileStatements(stat.statements_false,func);
						
						bc[jumpFalseIndex] = bc.length;  // ajuda o index de onde acaba o False Block
					}
					else
					{
						//bc[jumpTrueIndex] = bc.length; // ajusta o index de onde acaba o True Block
						this.replaceAllBy(bc,falseJumps,bc.length); // determina o inicio do bloco false
					}
				break;
			}
		}
	}
	
	getTipoRetorno(tA,tB)
	{
		if(tA == tB) return tA;
		if(tA == T_cadeia || tB == T_cadeia) return T_cadeia;
		if(tA == T_caracter || tB == T_caracter) return T_cadeia;
		if(tA == T_logico || tB == T_logico) return T_logico;
		if(tA == T_real || tB == T_real) return T_real;
		return tA;
	}
	
	tryConvertType(tRet,tA,bc)
	{
		if(tRet == T_cadeia)
		{
			if(tA == T_inteiro)bc.push(B_I2S);
			else if(tA == T_real)bc.push(B_F2S);
			else if(tA == T_logico)bc.push(B_B2S);
		}
		else if(tRet == T_real)
		{
			if(tA == T_inteiro)bc.push(B_F2I);
		}
	}
	
	checarCompatibilidadeTipo(tA,tB,op)
	{
		switch(op)
		{
			case T_attrib_plus:
			case T_plus:
			case T_attrib_minus:
			case T_minus:
			case T_attrib_mul:
			case T_mul:
			case T_attrib_div:
			case T_div:
			case T_attrib_rem:
			case T_rem:
			case T_attrib_shiftright:
			case T_shiftright:
			case T_attrib_shiftleft:
			case T_shiftleft:
			case T_attrib:
			case T_attrib_bitand:
			case T_bitand:
			case T_attrib_bitor:
			case T_bitor:
			case T_attrib_xor:
			case T_xor:
				switch(tA)
				{
					case T_inteiro: return (tB == T_inteiro || tB == T_real || ((op == T_plus || op == T_attrib_plus) && tB == T_cadeia));
					case T_real: return (tB == T_inteiro || tB == T_real || ((op == T_plus || op == T_attrib_plus) && tB == T_cadeia));
					case T_cadeia: return (op == T_attrib || op == T_plus || op == T_attrib_plus);
					case T_caracter: return (op == T_attrib || op == T_plus || op == T_attrib_plus) && (tB == T_cadeia || tB == T_caracter);
					case T_logico: 
					return (op == T_attrib 
					|| op == T_bitor || op == T_bitand || op == T_xor 
					|| op == T_attrib_bitand || op == T_attrib_bitor || op == T_attrib_bitxor);
				}
			break;
			case T_attrib_bitnot:
			case T_bitnot:
				return true;
			case T_unary_minus:
			case T_unary_plus:
			case T_autoinc:
			case T_autodec:
				return (tA == T_inteiro || tA == T_real);
			
			case T_and:
			case T_or:
				return tA == T_logico && tB == T_logico;
			case T_not: return tA == T_logico;
			case T_le:
			case T_lt:
			case T_ge:
			case T_gt:
				return ( tA == tB && (tA != T_logico) && (tB != T_logico));
			case T_notequals:
			case T_equals:
				return tA == tB;
		}
	}
	
	compileLogicalExpr(expr,bc,trueJumps,falseJumps)
	{
		if(
		   expr.op != T_and
		&& expr.op != T_or
		&& expr.op != T_ge
		&& expr.op != T_gt
		&& expr.op != T_le
		&& expr.op != T_lt
		&& expr.op != T_equals
		&& expr.op != T_notequals
		&& expr.op != T_not)
		{
			var tExprA = this.compileExpr(expr,bc,T_logico);
			if(tExprA != T_logico && (trueJumps !== false || falseJumps !== false))
			{
				this.erro("esta deveria ser uma expressão lógica. lembre-se que '=' é diferente de '==' ");
			}
			
			if(trueJumps === false && falseJumps === false)
			{
				// nada, ja ta com o logico na stack
			}
			else if(falseJumps === false)
			{
				bc.push(B_IFEQ); // se é verdadeiro, pq true == 0
				bc.push(0); // se verdadeiro
				
				trueJumps.push(bc.length-1);
			}
			else if(trueJumps === false)
			{
				bc.push(B_IFNE); // se é falso, pq false != 0
				bc.push(0); // se falso
				falseJumps.push(bc.length-1);
			}
			else
			{
				bc.push(B_IFEQ); // se é verdadeiro, pq true == 0
				bc.push(0); // se verdadeiro
				bc.push(B_GOTO);
				bc.push(0); // se falso
				
				trueJumps.push(bc.length-3);
				falseJumps.push(bc.length-1);
			}
			
			return T_logico;
		}
		
		if(expr.op == T_not)
		{
			this.erro("¡no implementado!");
			return T_vazio;
		}
		
		var tExprA = T_vazio;
		var tExprB = T_vazio;
		if(expr.op == T_and || expr.op == T_or) // AND E OR SHORT CIRCUITING
		{
			if(expr.op == T_and) // AND
			{
				var myFalseJumps = [];
				if(falseJumps !== false) myFalseJumps = falseJumps;
				// tem que avaliar todos e averiguar se todos são verdadeiro. mas se for falso já pula!
				tExprA = this.compileLogicalExpr(expr[0],bc,false,myFalseJumps);
					
				
				tExprB = this.compileLogicalExpr(expr[1],bc,trueJumps,myFalseJumps);
				
				if(trueJumps === false && falseJumps === false) // vai pular se for falso, continuar se for verdadeiro
				{
					var endIndex = bc.length +6;
					var falseIndex = bc.length +4;
					
					this.replaceAllBy(bc,myFalseJumps,falseIndex); // determina para que pulem para ca
					
					bc.push(B_PUSH);
					bc.push(B_TRUE); // 0
					bc.push(B_GOTO);
					bc.push(endIndex);
					bc.push(B_PUSH); // jumpFalse
					bc.push(B_FALSE); //1
				}
				else if(falseJumps === false)
				{
					this.replaceAllBy(bc,myFalseJumps,bc.length); // determina para que pulem para ca
				}
			}
			if(expr.op == T_or) // OR
			{
				var myTrueJumps = [];
				if(trueJumps !== false) myTrueJumps = trueJumps;
				// tem que avaliar todos e averiguar se tem pelo menos um verdadeiro. mas se for verdadeiro já pula!
				tExprA = this.compileLogicalExpr(expr[0],bc,myTrueJumps,false); // se for falso continua. se for verdadeiro pula pro final
				
				tExprB = this.compileLogicalExpr(expr[1],bc,myTrueJumps,falseJumps); // mas aqui pode pular dai
								
				if(trueJumps === false && falseJumps === false) // vai pular se for verdadeiro, continuar se for falso
				{
					var endIndex = bc.length +6;
					var trueIndex = bc.length +4;
					
					this.replaceAllBy(bc,myTrueJumps,trueIndex); // determina para que pulem para ca
					
					bc.push(B_PUSH);
					bc.push(B_FALSE); // 1
					bc.push(B_GOTO);
					bc.push(endIndex);
					bc.push(B_PUSH); // jumpFalse
					bc.push(B_TRUE); // 0
				}
				else if(trueJumps === false)
				{
					this.replaceAllBy(bc,myTrueJumps,bc.length); // determina para que pulem para ca
				}
			}
			if(tExprA == T_vazio || tExprB == T_vazio)
			{
				this.erro("um dos elementos da expressão não retorna nenhum valor.");
			}
			else
			{
				if(!this.checarCompatibilidadeTipo(tExprA,tExprB,expr.op))
				{
					this.erro("não pode aplicar a operação "+expr.op+" com os tipos "+getTypeWord(tExprA)+" e "+getTypeWord(tExprB));
				}
			}
		}
		else
		{
			tExprA = this.compileExpr(expr[0],bc,-1);
			if(tExprA == T_vazio)
			{
				bc.push(B_PUSH);bc.push(0);
			}
			tExprB = this.compileExpr(expr[1],bc,-1);
			if(tExprB == T_vazio)
			{
				bc.push(B_PUSH);bc.push(0);
			}
			if(tExprA == T_vazio || tExprB == T_vazio)
			{
				this.erro("um dos elementos da expressão não retorna nenhum valor.");
			}
			else
			{
				if(!this.checarCompatibilidadeTipo(tExprA,tExprB,expr.op))
				{
					this.erro("não pode aplicar a operação "+expr.op+" com os tipos "+getTypeWord(tExprA)+" e "+getTypeWord(tExprB));
				}
			}
			
			switch(expr.op)
			{
				case T_ge:bc.push(B_IFCMPLT);break;
				case T_gt:bc.push(B_IFCMPLE);break;
				case T_le:bc.push(B_IFCMPGT);break;
				case T_lt:bc.push(B_IFCMPGE);break;
				case T_notequals:bc.push(B_IFCMPEQ);break;
				case T_equals:bc.push(B_IFCMPNE);break;
				default:
					this.erro("ERRO CRÍTICO: operador incorreto:"+expr.op);
				break;
			}
			
			if(trueJumps === false && falseJumps === false)
			{
				var endIndex = bc.length +7;
				var falseIndex = bc.length +5;
				
				bc.push(falseIndex); // o jump do op
				bc.push(B_PUSH);
				bc.push(B_TRUE); // 0
				bc.push(B_GOTO);
				bc.push(endIndex);
				bc.push(B_PUSH); // jumpFalse
				bc.push(B_FALSE); // 1
								// jumpEnd
			}
			else
			{
				if(falseJumps === false)
				{
					bc.push(bc.length+3); // se falso
					bc.push(B_GOTO);
					bc.push(0); // se verdadeiro
					
					trueJumps.push(bc.length-1);
				}
				else if(trueJumps === false)
				{
					bc.push(0); // se falso
					falseJumps.push(bc.length-1);
				}
				else
				{
					bc.push(0); // se falso
					bc.push(B_GOTO);
					bc.push(0); // se verdadeiro
					
					trueJumps.push(bc.length-1);
					falseJumps.push(bc.length-3);
				}
			}
		}
		return T_logico;
	}
	
	// retorna o tipo da expressao
	compileExpr(expr,bc,typeExpected)
	{
		if(!expr) return T_vazio;
		
		if(
		   expr.op == T_and
		|| expr.op == T_or
		|| expr.op == T_ge
		|| expr.op == T_gt
		|| expr.op == T_le
		|| expr.op == T_lt
		|| expr.op == T_equals
		|| expr.op == T_notequals
		|| expr.op == T_not) return this.compileLogicalExpr(expr,bc,false,false);
		
		if(expr.length == 2)
		{
			var tExprA = T_vazio;
			var tExprB = T_vazio;
			if(expr.op == T_attrib)
			{
				var v = this.getVar(expr[0].name);
				tExprA = v.type;
				tExprB = this.compileExpr(expr[1],bc,tExprA);
				
				this.tryConvertType(tExprA,tExprB,bc);
				
				bc.push(v.global ? B_STOREGLOBAL : B_STORE);
				bc.push(v.index);
				
				
				if(v.isConst)
				{
					this.erro("não pode alterar o valor da constante '"+v.name+"'");
				}
				
				if(!this.checarCompatibilidadeTipo(tExprA,tExprB,expr.op))
				{
					this.erro("não pode colocar "+getTypeWord(tExprB)+" em uma variável do tipo "+getTypeWord(tExprA));
				}
				
				return tExprA;
			}
			else 
			{
				var tExpr = -1;
				if(isAttribOp(expr.op))
				{
					tExpr = expr[0].type;
				}
				tExprA = this.compileExpr(expr[0],bc,-1);
				if(tExprA == T_vazio)
				{
					bc.push(B_PUSH);bc.push(0);
				}
				tExprB = this.compileExpr(expr[1],bc,tExpr);
				if(tExprB == T_vazio)
				{
					bc.push(B_PUSH);bc.push(0);
				}
				
				if(tExprA == T_vazio || tExprB == T_vazio)
				{
					this.erro("um dos elementos da expressão não retorna nenhum valor.");
				}
				else
				{
					if(!this.checarCompatibilidadeTipo(tExprA,tExprB,expr.op))
					{
						this.erro("não pode aplicar a operação com os tipos "+getTypeWord(tExprA)+" e "+getTypeWord(tExprB));
					}
				}
				
				var tRet = this.getTipoRetorno(tExprA,tExprB); // quando é divisão retorna real ou inteiro?
				
				if(tRet != tExprA && (tRet == T_inteiro || tRet == T_cadeia))
				{
					// gambiarra
					bc.push(B_SWAP);
					this.tryConvertType(tRet,tExprA,bc);
					bc.push(B_SWAP);
				}
				
				if(tRet != tExprB)
				{
					this.tryConvertType(tRet,tExprB,bc);
				}
				
				switch(expr.op)
				{
					case T_plus:bc.push(B_ADD);break;
					case T_minus:bc.push(B_SUB);break;
					case T_mul:bc.push(B_MUL);break;
					case T_div:bc.push(B_DIV);break;
					case T_rem:bc.push(B_REM);break;
					case T_shiftright:bc.push(B_SHR);break;
					case T_shiftleft:bc.push(B_SHL);break;
					/*case T_ge:gen(" >= ");break;
					case T_gt:gen(" > ");break;
					case T_le:gen(" <= ");break;
					case T_lt:gen(" < ");break;
					case T_notequals:gen(" != ");break;
					case T_equals:gen(" == ");break;
					case T_and:gen(" && ");break;
					case T_or:gen(" || ");break;*/
					case T_bitand:
						if(tExprA == T_logico) // logico é invertido
							bc.push(B_OR);
						else
							bc.push(B_AND);
						break;
					case T_bitor:
						if(tExprA == T_logico) // logico é invertido
							bc.push(B_AND);
						else
							bc.push(B_OR);
						break;
					case T_xor:bc.push(B_XOR);break;
					default:
						this.erro("o operador "+expr.op+" não pode ter dois operandos.");
						bc.push(B_ADD);
					break;
				}
				
				if(isAttribOp(expr.op))
				{
					var v = this.getVar(expr[0].name);
					bc.push(B_DUP); // o valor fica na stack. mds isso vai da o maior problema
					
					this.tryConvertType(tExprA,tExprB,bc);
					
					bc.push(v.global ? B_STOREGLOBAL : B_STORE);
					bc.push(v.index);
					
					
					
					if(v.isConst)
					{
						this.erro("não pode alterar o valor da constante '"+v.name+"'");
					}
					return tExprA;
				}
				return tRet;
			}
			
		}
		else
		{
			switch(expr.op)
			{
				case T_unary_plus:return this.compileExpr(expr[0],bc,-1);
				case T_unary_minus:var tExpr = this.compileExpr(expr[0],bc,-1);bc.push(B_NEG);return tExpr;
				case T_autoinc:
					var v = this.getVar(expr[0].name);
					var tExpr = this.compileExpr(expr[0],bc,-1);
					bc.push(B_PUSH);
					bc.push(1);
					bc.push(B_ADD);
					bc.push(B_DUP); // o valor fica na stack. mds isso vai da o maior problema
					bc.push(v.global ? B_STOREGLOBAL : B_STORE);
					bc.push(v.index);
					
					if(v.isConst)
					{
						this.erro("não pode alterar o valor da constante '"+v.name+"'");
					}
					return tExpr;
				case T_autodec:
					var v = this.getVar(expr[0].name);
					var tExpr = this.compileExpr(expr[0],bc,-1);
					bc.push(B_PUSH);
					bc.push(1);
					bc.push(B_SUB);
					bc.push(B_DUP); // o valor fica na stack. mds isso vai da o maior problema
					bc.push(v.global ? B_STOREGLOBAL : B_STORE);
					bc.push(v.index);
					
					if(v.isConst)
					{
						this.erro("não pode alterar o valor da constante '"+v.name+"'");
					}
					return tExpr;
				case T_bitnot:var tExpr = this.compileExpr(expr[0],bc,-1);bc.push(B_NOT);return tExpr;
				//case T_not:tis.compileExpr(expr[0],bc,variableMap);break;
				case T_parO: // methCall
				{
					var args = expr.args;
					if(expr.name == "escreva" && args.length >= 1)
					{
						for(var i =0;i<args.length;i++)
						{
							var tExpr = this.compileExpr(args[i],bc,-1);
							this.tryConvertType(T_cadeia,tExpr,bc);
							bc.push(B_INVOKE);
							var funcIndex = this.getFuncIndex(expr.name);
							bc.push(funcIndex);
							bc.push(1);
						}
					}
					else
					{
						var methName= expr.name;
						if(expr.name == "leia" && args.length == 1)
						{
							var v = this.getVar(args[0].name);
							methName += "$"+getTypeWord(v.type);
						}
						for(var i =0;i<args.length;i++)
						{
							this.compileExpr(args[i],bc,-1);
						}
						bc.push(B_INVOKE);
						var funcIndex = this.getFuncIndex(methName);
						bc.push(funcIndex);
						bc.push(args.length);
						
						if(expr.name == "leia" && args.length == 1)
						{
							var v = this.getVar(args[0].name);
							bc.push(v.global ? B_STOREGLOBAL : B_STORE);
							bc.push(v.index);
							
							if(v.isConst)
							{
								this.erro("não pode alterar o valor da constante '"+v.name+"'");
							}
						}
					}
				}
				return T_vazio;// tipos de retorno de funcoes nao implementados
				case T_word: 
					var v = this.getVar(expr.name);
					
					bc.push(v.global ? B_LOADGLOBAL : B_LOAD);
					bc.push(v.index);
					return v.type;
				case T_inteiroLiteral:bc.push(B_PUSH);bc.push(parseInt(expr.value));return T_inteiro;
				case T_realLiteral:bc.push(B_PUSH);bc.push(parseFloat(expr.value));return T_real;
				case T_cadeiaLiteral:bc.push(B_PUSH);bc.push(expr.value);return T_cadeia;
				case T_caracterLiteral:bc.push(B_PUSH);bc.push(expr.value);return T_caracter;
				// x == 0: true
				// x != 0: false
				case T_logicoLiteral: bc.push(B_PUSH);bc.push(expr.value == "verdadeiro" ? B_TRUE : B_FALSE);return T_logico; 
			}
		}
	}
}