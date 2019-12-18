var STATEMENT_declVar = 1;
var STATEMENT_declArr = 10;
var STATEMENT_expr = 2;
var STATEMENT_block = 3;
var STATEMENT_se = 4;
var STATEMENT_enquanto = 5;
var STATEMENT_facaEnquanto = 6;
var STATEMENT_para = 7;
var STATEMENT_pare = 8;
var STATEMENT_ret = 9;
var STATEMENT_escolha = 11;
var STATEMENT_caso = 12;

function pmatch(index,tokens)
{
	var ti = index;
	for (var i = 2; i < arguments.length && ti < tokens.length; i++) {
		if(tokens[ti].id != arguments[i])
		{
			return false;
		}
		ti++;
	}
	return true;
}

function numberOfLinesUntil(index,str)
{
	var st = str.substring(0,index);
	return (st.match(/\r?\n/g) || '').length + 1;
}

class Parser {
    constructor(tokens,textInput) {
		this.tokens = tokens;
		this.textInput = textInput;
		this.tree = [];
    }
	
	erro(token,msg)
	{	
		//var line = this.textInput.substring(token.index,this.textInput.indexOf("\n",token.index));
		//console.log("linha "+numberOfLinesUntil(token.index,this.textInput)+", erro:"+msg);
		//console.log("perto de '"+line+"'");
		//this.errors.push({token:token,msg:msg});
		enviarErro(this.textInput,token,msg);
	}
	

	
	parse()
	{
		if(!pmatch(0,this.tokens,T_programa)){ this.erro(this.tokens[0],"não encontrou o programa."); return null;}
		
		var blockres = this.extractBlock(1,this.tokens,T_bracesO,T_bracesC);
		this.tree = this.parsePrograma(blockres.block);
		
		return this.tree;
	}
	
	parsePrograma(tokens)
	{
		var programaTree = {incluas:[],variaveis:[],funcoes:[]};
		for(var i=0;i<tokens.length;i++)
		{
			var t = tokens[i].id;
			// incluas
			if(t == T_inclua)
			{
				i = this.parseDeclBiblioteca(i,tokens,programaTree.incluas);
			}
			// variaveis globais
			//declaracão de variáveis, vetor, matriz
			// type word = expression [, word = expression]
			else if(isTypeWord(t) || t == T_const)
			{
				i = this.parseDeclVariavel(i,tokens,programaTree.variaveis);
			}
			
			// funcoes
			//else if(pmatch(i,tokens,T_funcao))
			else if(t == T_funcao)
			{
				var funcType = T_vazio;
				
				var funcPars = [];
				var funcStats = [];
				i++;// n entendeu?
				//          i
				// funcao <tipo> nome ( <pars> ) { <bloco> }
				
				if(isTypeWord(tokens[i].id))
				{
					funcType = tokens[i].id;
					//          i -->
					// funcao <tipo> nome ( <pars> ) { <bloco> }
					i++;
				}
				
				this.processingFuncType = funcType; // para decidir sobre os retorne
				var funcName = tokens[i].txt;
				//                i -->
				// funcao <tipo> nome ( <pars> ) { <bloco> }
				i++;
				
				i = this.parseDeclParametros(i,tokens,funcPars);
				
				//                             i -->
				// funcao <tipo> nome ( <pars> ) { <bloco> }
				i++;
				
				i = this.parseStatementOrBlock(i,tokens,funcStats);
				
				
				programaTree.funcoes.push({name:funcName,type:funcType,parameters:funcPars,statements:funcStats});
				
			}
			else
			{
				this.erro(tokens[i],"não é variável nem função, remova isso");
			}
		}
		return programaTree;
	}
	
	parseDeclBiblioteca(i,tokens,tree)
	{
		//   i -->
		//	inclua biblioteca Util --> u
		//  inclua biblioteca Util
		i++;
		if(tokens[i].id != T_biblioteca)
		{
			this.erro(tokens[i],"esperando 'biblioteca' logo após a palavra inclua");
			i--; // n estou com fome.
		}

		i++;		
		var biblioteca = tokens[i].txt;
		var alias = false;
		
		if(tokens[i+1].id == T_arrow)
		{
			i += 2;
			alias = tokens[i].txt;
		}
		
		tree.push({name:biblioteca,alias:alias});
		
		return i;
	}
	
	parseDeclParametros(i,tokens,tree)
	{
		if(tokens[i].id != T_parO)
		{
			this.erro(tokens[i],"esqueceu de abrir os parênteses da função");
		}
		
		// i -->
		// ( tipo nome [, tipo nome]* )
		//  tipo &nome
		//  tipo nome[]
		i++;
		while(tokens[i].id != T_parC) // se tem alguma coisa
		{
			if(!isTypeWord(tokens[i].id))
			{
				this.erro(tokens[i],"uma declaração de parâmetro deve começar com um tipo de variável");
				i++;
				break;
			}
			var tIndex = tokens[i].index;
			var varType = tokens[i].id;i++;
			var byRef = false;
			// ***** Passando por Referência *******
			
			if(tokens[i].id == T_bitand)
			{
				byRef = true;
				i++;
			}
			
			// *****                         *******
			if(tokens[i].id != T_word)
			{
				this.erro(tokens[i],"o nome do parâmetro é inválido, deve ser apenas letras");
				i++;
				break;
			}
			var varName = tokens[i].txt;i++;
			
			
			if(tokens[i].id == T_squareO)
			{
				var arrayDimExpr = [];
				do
				{
					//            i --->
					//  type word [    ] [? ]?
					i++;
					arrayDimExpr.push(false); // eu sei que isso deveria dar erro mas dane-se
					
					if(tokens[i].id != T_squareC) this.erro(tokens[i],"esqueceu de fechar os colchetes na declaração de vetor");
					
					//                 i->
					//  type word [    ] [? ]?
					i++;
				}
				while(tokens[i].id == T_squareO);
				
				tree.push({id:STATEMENT_declArr,index:tIndex,type:varType,isConst:false,byRef:byRef,name:varName,size_expr:arrayDimExpr,values:[]});
			}
			else
			{
				tree.push({id:STATEMENT_declVar,index:tIndex,type:varType,isConst:false,byRef:byRef,name:varName,expr:false});
			}
			if(tokens[i].id != T_comma)
			{
				break;
			}
			else
			{
				i++;
			}
		}
		
		if(tokens[i].id != T_parC)
		{
			this.erro(tokens[i],"esqueceu de fechar os parênteses da função");
		}
		return i;
	}
	
	parseStatementOrBlock(i,tokens,tree)
	{
		var t = tokens[i].id;
		var tIndex = tokens[i].index;
		// inicio de bloco { statements }
		if(t == T_bracesO)
		{
			var statements = [];
			// i -->
			// { ...
			i++; 
			while(i < tokens.length && tokens[i].id != T_bracesC)
			{
				
				i = this.parseStatement(i,tokens,statements);
				
				i++; // NÃO ESQUECER
			}
			
			tree.push({id:STATEMENT_block,index:tIndex,statements:statements});
			return i;
		}
		else
		{
			return this.parseStatement(i,tokens,tree);
		}
	}
	
	parseStatement(i,tokens,tree)
	{
		var t = tokens[i].id;
		var tIndex = tokens[i].index;
		
		//declaracão de variáveis, vetor, matriz
		// type word = expression [, word = expression]
		if(isTypeWord(t) || t == T_const)
		{
			i = this.parseDeclVariavel(i,tokens,tree);
		}
		
		//pare, continue??, retorne
		// "pare"
		// "retorne" expression
		else if(t == T_pare)
		{
			//this.erro(tokens[i],"pare não implementado ainda");
			tree.push({id:STATEMENT_pare,index:tIndex});
		}
		else if(t == T_retorne)
		{
			var exprTree = false;
			if(this.processingFuncType != T_vazio) // se a função tem retorno
			{
				i++;
				exprTree = [];
				i = this.parseExpressao(i,tokens,exprTree,0);
				exprTree = exprTree[0];
			}
			tree.push({id:STATEMENT_ret,index:tIndex,expr:exprTree});
		}
		
		//se, se-senao
		// "se" ( expression ) block
		else if(t == T_se)
		{
			var logic_Expr = [];
			var statements_true = [];
			var statements_false = false;
			// i -->
			// se    (   expr   )
			i++;
			if(tokens[i].id != T_parO) this.erro(tokens[i],"esqueceu de abrir os parênteses da condição se");
			i = this.parseExpressao(i,tokens,logic_Expr,0);
			//                  i -->
			// se    (   expr   )  statementOrBlock
			if(tokens[i].id != T_parC) this.erro(tokens[i],"esqueceu de fechar os parênteses da condição se");
			i++;
			i = this.parseStatementOrBlock(i,tokens,statements_true);
			//                                   i -->
			// se    (   expr   )  statementOrBlock senao?
			i++;
			if(tokens[i].id == T_senao)
			{
				statements_false = [];
				//                                        i -->
				// se    (   expr   )  statementOrBlock senao?
				i++;
				i = this.parseStatementOrBlock(i,tokens,statements_false);
			}
			else
			{
				//                                    <-- i
				// se    (   expr   )  statementOrBlock !senao!
				i--;
			}
			tree.push({id:STATEMENT_se,index:tIndex,expr:logic_Expr[0],statements_true:statements_true,statements_false:statements_false});
			
		}
		
		//enquanto, faca-enquanto
		// "enquanto" ( expression ) block
		// "faca" block "enquanto" ( expression )
		else if(t == T_enquanto)
		{
			var logic_Expr = [];
			var statements = [];
			// i -->
			// enquanto (   expr   )
			i++;
			if(tokens[i].id != T_parO)
			{
				this.erro(tokens[i],"esqueceu de abrir os parênteses da condição do enquanto");
			}
			i = this.parseExpressao(i,tokens,logic_Expr,0);

			if(tokens[i].id != T_parC)
			{
				this.erro(tokens[i],"esqueceu de fechar os parênteses da condição do enquanto");
			}
			//                       i -->
			// enquanto   (   expr   )  statementOrBlock
			i++;
			
			i = this.parseStatementOrBlock(i,tokens,statements);
			
			tree.push({id:STATEMENT_enquanto,index:tIndex,expr:logic_Expr[0],statements:statements});
		}
		else if(t == T_faca)
		{
			var logic_Expr = [];
			var statements = [];
			//  i -->
			// faca  statementOrBlock enquanto ( expr )
			i++;
			i = this.parseStatementOrBlock(i,tokens,statements);
			
			//                    i -->
			// faca  statementOrBlock enquanto ( expr )
			i++;
			if(tokens[i].id != T_enquanto) this.erro(tokens[i],"esperando 'enquanto' aqui, a estrutura faca está incompleta");
			
			//                           i -->
			// faca  statementOrBlock enquanto ( expr )
			i++;
			if(tokens[i].id != T_parO) this.erro(tokens[i],"esqueceu de abrir os parênteses da condição do enquanto");
			i = this.parseExpressao(i,tokens,logic_Expr,0);
			//                  i -->
			// enquanto   (   expr   )  statementOrBlock
			if(tokens[i].id != T_parC) this.erro(tokens[i],"esqueceu de fechar os parênteses da condição do enquanto");
			
			tree.push({id:STATEMENT_facaEnquanto,index:tIndex,expr:logic_Expr[0],statements:statements});
		}
		
		
		//para
		// "para" ( {var declaration | expression} ; expression ; expression ) block
		else if(t == T_para)
		{
			var decl = false;
			var logic_Expr = false;
			var inc = false;
			var statements = [];
			//  i -->
			// para  (
			i++;
			if(tokens[i].id != T_parO)
			{
				this.erro(tokens[i],"esqueceu de abrir os parênteses do laço para");
				i--;
			}
			
			//        i -->
			// para  (    ?? ;
			i++;
			if(tokens[i].id != T_semi)
			{
				decl = [];
				i = this.parseStatement(i,tokens,decl);
				if(decl.length == 1) // aqui pode ter vários, por causa da declaração de variável que pode dar um monte.
				if(decl[0].id != STATEMENT_declVar && decl[0].id != STATEMENT_expr)
				{
					this.erro(tokens[i],"dentro do para só pode declarações de variáveis e expressões. remova isso");
					decl = false;
				}
			} else i--;
			
			
			//          i -->
			// para  ( ...   ;
			i++;
			if(tokens[i].id != T_semi)
			{
				this.erro(tokens[i],"estava esperando o ponto e vírgula do para aqui!");
				i--;
			}
			
			//               i -->
			// para  ( ...   ; logic-expr
			i++;
			if(tokens[i].id != T_semi)
			{
				logic_Expr =[];
				i = this.parseExpressao(i,tokens,logic_Expr,0);
			} else i--;
			
			//                       i -->
			// para  ( ...   ; logic-expr ;
			i++;
			if(tokens[i].id != T_semi)
			{
				this.erro(tokens[i],"estava esperando o ponto e vírgula do para aqui!");
				i--;
			}
			
			//                              i -->
			// para  ( ...   ; logic-expr   ;    expr  )
			i++;
			if(tokens[i].id != T_parC)
			{
				inc =[];
				i = this.parseExpressao(i,tokens,inc,0);
				//                                   i -->
				// para  ( ...   ; logic-expr   ;    expr  )
				i++;
				if(tokens[i].id != T_parC)
				{
					this.erro(tokens[i-1],"esqueceu de fechar os parênteses do para!");
					i--;
				}
			}
			// pular o parenteses.
			i++;
			i = this.parseStatementOrBlock(i,tokens,statements);
			
			tree.push({id:STATEMENT_para,index:tIndex,decl:decl,expr:logic_Expr[0],inc:inc[0],statements:statements});
		}
		
		//escolha
		// "escolha" ( expression ) { // body }
		else if(t == T_escolha)
		{
			var escolha_Expr = [];
			var statements = [];
			// i -->
			// escolha (   expr   )
			i++;
			if(tokens[i].id != T_parO)
			{
				this.erro(tokens[i],"esqueceu de abrir os parênteses do escolha");
			}
			i = this.parseExpressao(i,tokens,escolha_Expr,0);

			if(tokens[i].id != T_parC)
			{
				this.erro(tokens[i],"esqueceu de fechar os parênteses do escolha");
			}
			//                       i -->
			// escolha   (   expr   )  { // corpo }
			i++;
			
			i = this.parseStatementOrBlock(i,tokens,statements);
			
			tree.push({id:STATEMENT_escolha,index:tIndex,expr:escolha_Expr[0],statements:statements});
		}
		
		// corpo do escolha
		// "caso" expression :
		// "caso" "contrario" :
		else if(t == T_caso)
		{
			var caso_Expr = [];
			var caso_contrario = false;
			// i -->
			// caso expr :
			i++;
			
			if(tokens[i].id == T_contrario)
			{
				caso_Expr = false;
				caso_contrario = true;
			}
			else
			{
				i = this.parseExpressao(i,tokens,caso_Expr,0);
			}
			//          i -->
			// caso   expr   :
			i++;
			if(tokens[i].id != T_colon)
			{
				this.erro(tokens[i],"esqueceu dos dois-pontos depois do caso:"+tokens[i].id);
			}
			
			tree.push({id:STATEMENT_caso,contrario:caso_contrario,index:tIndex,expr:caso_Expr[0]});
		}
		//chamadas de funções
		//chamadas de funções de bibliotecas
		//atribuições
		//auto incremento
		// word = expression
		// word [ expression ] = expression
		// word ( [, expression] )
		// word . word ( [, expression] )
		// expression
		else
		{
			//funcaoTree.push("expressao");
			var exprTree = [];
			i = this.parseExpressao(i,tokens,exprTree,0);
			tree.push({id:STATEMENT_expr,index:tIndex,expr:exprTree[0]});
		}
		return i;
	}
	
	parseDeclArray(i,tokens,tree)
	{
		if(tokens[i].id != T_bracesO) this.erro(tokens[i],"esqueceu de abrir as chaves na declaração dos valores do vetor");
		
		do
		{
			//                                                i --->
			//  type word [ expression ]    =   {  expression ,  expression , ... }
			i++;
			
			if(tokens[i].id == T_bracesO)
			{
				var expr = []
				i = this.parseDeclArray(i,tokens,expr);
				tree.push(expr);
			}
			else
			{
				i = this.parseExpressao(i,tokens,tree,0);
			}
			
			//                                                        i --->
			//  type word [ expression ]    =   {  expression ,  expression , ... }
			i++;
		}while(tokens[i].id == T_comma);
		
		return i;
	}
	
	parseDeclVariavel(i,tokens,tree)
	{	
		var isConst = false;
		if(tokens[i].id == T_const)
		{
			isConst = true;
			//    i-->
			// const vartype varname ...
			i++;
		}
		
		var varType = tokens[i].id;
		
		if(!isTypeWord(varType))
		{
			this.erro(tokens[i],"decl. de variável incompleta, falta o tipo da variável:");
			return i;
		}
		
			
		while(true)
		{
			var tIndex= tokens[i+1].index; // index para saber onde está o erro na hora da execução
			// arrays
			// type word [ expression ] = { expression, ... }
			// type word [ ] = { expression, ... }
			// type word [ expression ]
			
			// variables
			// type word = expression [, word = expression]
			// type word
			
			if(tokens[i+1].id == T_word && tokens[i+2].id == T_squareO)
			{
				//    i -->
				//  type word [ expr?  ]    =   {  expression, ... }
				i++;
				var varName = tokens[i].txt;
				var arrayDimExpr = [];
				do
				{
					if(tokens[i+2].id != T_squareC)
					{
						i = this.parseExpressao(i+2,tokens,arrayDimExpr,0);
					}
					else
					{
						arrayDimExpr.push(false); // eu sei que isso deveria dar erro mas dane-se
						i++;
					}
					//                   i --->
					//  type word [ expression ]    =   {  expression, ... }
					i++;
					if(tokens[i].id != T_squareC) this.erro(tokens[i],"esqueceu de fechar os colchetes na declaração de vetor");
				}
				while(tokens[i+1].id == T_squareO);
				
				
				var ArrayValuesExpr = [];
				if(tokens[i+1].id == T_attrib)
				{
					//                         i ------->
					//  type word [ expression ]    =   {  expression, ... }
					i = this.parseDeclArray(i+2,tokens,ArrayValuesExpr);
				}
				
				tree.push({id:STATEMENT_declArr,index:tIndex,type:varType,isConst:isConst,name:varName,size_expr:arrayDimExpr,values:ArrayValuesExpr});
			}
			else if(tokens[i+1].id == T_word && tokens[i+2].id == T_attrib)
			{
				
				var varName = tokens[i+1].txt;
				var exprTree = [];
				i = this.parseExpressao(i+3,tokens,exprTree,0); // NAO ESQUECER!
				
				tree.push({id:STATEMENT_declVar,index:tIndex,type:varType,isConst:isConst,name:varName,expr:exprTree[0]});
			}
			else if(tokens[i+1].id == T_word)
			{
				var varName = tokens[i+1].txt;
				var exprTree = false;
				
				if(isConst)
				{
					this.erro(tokens[i],"não pode declarar uma variável constante e não definir o valor imediatamente.");
				}
				
				tree.push({id:STATEMENT_declVar,index:tIndex,type:varType,isConst:isConst,name:varName,expr:exprTree});
				i++; // NAO ESQUECER!
			}
			else
			{
				this.erro(tokens[i+1],"decl. de variável incompleta, falta o nome da variável:");
				i++; // NAO ESQUECER!
			}
			
			i++;
			if(tokens.length <= i || tokens[i].id != T_comma)
			{
				i--; // para nao comer tokens dos outros
				break;
			}
		}
		return i;
	}
	
	parseExpressao(i,tokens,tree,prevPrecedence) // n me pergunte como foi que consegui fazer essa parte funcionar, até eu me surpreendi!
	{
		
		var t = tokens[i].id;
		
		var member0 = [];
		// unaryop member
		if(isOperator(t)) // op ...
		{
			if(canBePreUnary(t)) // unaryop ...
			{
				if(t == T_plus) t = T_unary_plus;
				if(t == T_minus) t = T_unary_minus;
				i++;
				
				if(tokens.length > i)
				{
					member0.op = t;
					i = this.parseExpressao(i,tokens,member0,getOpPrecedence(member0.op));
				}
				else // acabou aqui;
				{
					this.erro(tokens[i],"expressao numérica inválida, falta o operando à frente");
					return i;
				}
			}
			else
			{
				//exprTree = ["operador unitário inválido:",tokens[i]];
				this.erro(tokens[i],"expressao numérica inválida, falta um dos operandos");
				return i;
			}
		}
		// member post-unaryop
		// member
		else
		{
			i = this.parseExprMember(i,tokens,member0);
			i++; 
			
			// member op?
			if(tokens.length > i && isPostUnary(tokens[i].id)) // se tem um operador
			{
				// operator
				member0.op = tokens[i].id;
			}
			else // member;
			{
				//     <-- i
				// member0 op
				i--;
				member0 = member0[0];
			}
		}
		
		while(true)
		{
			i++;
			if(tokens.length <= i || !isDualOperator(tokens[i].id)) // nao tem mais nada pra frente, postunary deveria ser analisado? mas aff!
			{
				tree.push(member0);
				i--;
				return i;
			}
			
			var op = tokens[i].id;
			
			if(getOpPrecedence(op) <= prevPrecedence) // acabou aqui, tem que voltar pro operador anterior
			{	
				// voltar para o operador anterior
				tree.push(member0);
				//     <-- i
				// member0 op
				i--;
				return i;
			}
			else // tem que continuar procurando expressoes, pq esse operador tem mais precedencia
			{
				var m0 = member0;
				member0 = [m0];
				member0.op = op;
				
				//          i -->
				// member0 op
				i++;
				
				i = this.parseExpressao(i,tokens,member0,getOpPrecedence(member0.op));
				
				// ae vai continua no loop e vai ver se tem mais operadores...
			}
		}
	}
	
	parseExprMember(i,tokens,tree)
	{
		//word . word ( [, expression] )
		if(pmatch(i,tokens,T_word,T_dot))
		{
			var biblioteca = tokens[i].txt;
			
			i += 2;
			
			var campo = {op:T_word,name:tokens[i].txt};
			if(tokens[i+1].id == T_parO)
			{
				campo = [];
				i = this.parseMethCall(i,tokens,campo);
				campo = campo[0];
			}
			
			tree.push({op:T_dot,name:biblioteca,expr:campo});
			
			return i;
		}
		//word ( [, expression] )
		else if(pmatch(i,tokens,T_word,T_parO))
		{
			return this.parseMethCall(i,tokens,tree);
		}
		//word [ expression ]
		//word [ expression ] [ expression ]
		else if(pmatch(i,tokens,T_word,T_squareO))
		{
			var word = tokens[i].txt;

			var exprTree = [];
			//i = this.parseExpressao(i,tokens,exprTree,0);
			var arrayDimExpr = [];

			//  i
			//word [ expression ] [ expression ]
			do
			{
				if(tokens[i+2].id != T_squareC)
				{
					i = this.parseExpressao(i+2,tokens,arrayDimExpr,0);
				}
				else
				{
					this.erro(tokens[i],"esperando expressão que indica a posição do vetor, mas não encontrou nada");
					arrayDimExpr.push({op:T_inteiroLiteral,value:"0"});
					i++;
				}
				//                   i --->
				//  type word [ expression ]
				i++;
				if(tokens[i].id != T_squareC) this.erro(tokens[i],"esqueceu de fechar os colchetes na declaração de vetor");
			}
			while(tokens[i+1].id == T_squareO);

			tree.push({op:T_squareO,name:word,expr:arrayDimExpr});
			
			return i;
		}
		//word
		else if(pmatch(i,tokens,T_word))
		{
			tree.push({op:T_word,name:tokens[i].txt});
			return i;
		}
		//( expression )
		else if(pmatch(i,tokens,T_parO))
		{
			i = this.parseExpressao(i+1,tokens,tree,0);
			if(tokens[i+1].id != T_parC)
			{
				this.erro(tokens[i+1],"esqueceu de fechar os parênteses da expressão númerica");
			}
			return i+1; // pular o )
		}
		//literal
		else if(isLiteral(tokens[i].id))
		{
			tree.push({op:tokens[i].id,value:tokens[i].txt});
			return i;
		}
		else
		{
			//tree.push(["inválido",tokens[i]]);
			this.erro(tokens[i],"esperando por membro de expressao, remova isso");
			return i;
		}
	}
	
	parseMethCall(i,tokens,tree)
	{
	    // i
		//word ( [, expression] )
		var methName = tokens[i].txt;
		i++; // já sabe que é (, nem adianta checar
		
		var args = [];
		if(tokens[i+1].id != T_parC) // quando é tipo funcao();
		{
			while(true)
			{
				//                    pular a ,
				i = this.parseExpressao(i+1,tokens,args);
				
				i++;
				if(tokens.length <= i || tokens[i].id != T_comma)
				{
					break;
				}
			}
		
			if(tokens[i].id != T_parC)
			{
				this.erro(tokens[i-1],"esqueceu de fechar os parênteses da chamada de função.");
				i--;
			}
		}
		else
		{
			//     i -->
			//word (     )
			i++;
		}
		
		
		tree.push({op:T_parO,name:methName,args:args});
		return i;
	}
	
	skipTo(index,tokens,tk)
	{
		for(var i=index;i<tokens.length;i++)
		{
			if(tokens[i].id == tk) return i;
		}
		return -1;
	}

	extractBlock(index,tokens,SEPopen,SEPclose)
	{
		var block = [];
		/*var prev_index = index;
		index = this.skipTo(index,tokens,SEPopen);
		if(index <= -1)
		{
			this.erro(tokens[prev_index],"esperando por inicio de bloco, mas não achou");
		}*/
		var depth = 0;
		if(tokens[index].id != SEPopen)
		{
			this.erro(tokens[index],"esqueceu de abrir o bloco, antes de '"+tokens[index].txt+"'");
			//index = this.skipTo(index,tokens,SEPopen);
			//if(index <= -1)
			//{
			//	this.erro(tokens[prev_index],"mesmo procurando por inicio de bloco, não achou");
			//}
			depth += 1;
		}
		
		var i=index;
		for(;i<tokens.length;i++)
		{

			if(tokens[i].id == SEPopen)
			{
				depth++;
				if(depth > 1)
				{
					block.push(tokens[i]);
				}
			}
			else if(tokens[i].id == SEPclose)
			{
				depth--;
				if(depth <= 0)
				{
					return {block:block,index:i};
				}
				else
				{
					block.push(tokens[i]);
				}
			}
			else
			{
				block.push(tokens[i]);
			}
			
		}
		//console.log("não encontrou o fim do bloco:"+SEPopen);
		this.erro(tokens[index],"não encontrou o fim do bloco iniciado com "+tokens[index].txt);
		return {block:block,index:i};
	}


}

