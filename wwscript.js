// wwchecker
// james yuzawa
// jyuzawa.com
// github.com/yuzawa-san

var checkerActive=false;

$(document).ready(function() {
    // make floater box
    floater=$('<div/>').attr('id','wwchecker-floater');
    
    // make preferences box
    prefBox=$('<div/>').attr('id','wwchecker-box');
    activeCheckbox=$('<input/>').attr('id','wwchecker-active').attr('type','checkbox');
    prefBox.append(activeCheckbox);
    prefBox.append(" check for matching parentheses");
    
    // attach boxes
    $('body').prepend(prefBox).prepend(floater);
    
    
    // first run
    if(!localStorage.wwactive){
        localStorage.wwactive='active';
    }
    checkerActive=(localStorage.wwactive=='active');
    
    
    // bind events to answer boxes
    $('input[id^=AnSwEr]').each(function(){
        // do initial check on all of the boxes
        isValid($(this));
    }).keyup(function (){
        // eval on keyup
        isValid($(this));
    }).focus(function(event){
        // display floater on focus
        if(!checkerActive){
            return;
        }
        // setup metrics
        offsetStruct=$(this).offset();
        itemWidth=$(this).outerWidth();
        itemHeight=$(this).outerHeight();
        $("#wwchecker-floater").css({
            left:offsetStruct.left,
            top:offsetStruct.top+itemHeight+10
        }).show();
        isValid($(this));
    }).blur(function(){
        // hide floater on blur
        $("#wwchecker-floater").hide();
    });
    
    // bind preferences
    $("#wwchecker-active").attr('checked', checkerActive).click(function(){
        checkerActive=($(this).attr('checked')=="checked");
        if(checkerActive){
            localStorage.wwactive='active';
        }else{
            localStorage.wwactive='inactive';
        }
    });
});

// generate proper number of spaces
function spaces(n){
    var str="";
    for(var i=0;i<n;i++){
        str+="&nbsp;";
    }
    return str;
}

// check validation of the value of an object.
function isValid($obj){
    var expr=$obj.val();
    // display box only if preferences allow, string is nonempty, and contains grouping characters
    if(checkerActive && expr !== '' && expr.match(/[\(\[\{\)\]\}]/)){
        $("#wwchecker-floater").show();
    }else{
        $("#wwchecker-floater").hide();
    }
    // validation returns: [valid,error location,formatted string]
    validationOutput=function(str){
        var tokenStack=[];
        var sexyText="";
        var ct=0;
        for(var i=0;i<str.length;i++){
            ch = str.charAt(i);
            if(ch=="("||ch=="["||ch=="{"){
                // opening grouping
                tokenStack.push(ch);
                sexyText+="<span class=ww_pair"+(ct%5)+">"+ch+"</span>";
                ct++;
            }else if(ch==")"||ch=="]"||ch=="}"){
                // closing grouping
                head=tokenStack[tokenStack.length-1];
                if(!head){
                    // stack is empty
                    return [false,i,sexyText+"<span class=ww_pairbad>"+str.substring(i)+"</span>"];
                }
                if((head=="("&&ch==")") || (head=="["&&ch=="]") || (head=="{"&&ch=="}")){
                    // match found
                    tokenStack.pop();
                    ct--;
                    sexyText+="<span class=ww_pair"+(ct%5)+">"+ch+"</span>";
                }else{
                    // grouping mistmatch
                    return [false,i,sexyText+"<span class=ww_pairbad>"+str.substring(i)+"</span>"];
                }
            }else{
                // other characters, escaping html
                if(ch=="<"){
                    sexyText+="&lt;";
                }else if(ct==">"){
                    sexyText+="&gt;";
                }else{
                    sexyText+=ch;
                }
            }
        }
        if(tokenStack.length===0){
            // valid
            return [true,0,sexyText];
        }
        // invalid at end
        return [false,str.length-1,sexyText];
    }(expr);
    
    // remove any old styles
    if($obj.attr("style")){
        $obj.removeAttr("style");
    }
    
    if(validationOutput[0]){
        // is valid
        $obj.addClass('ww_valid');
        $obj.removeClass('ww_invalid');
        $("#wwchecker-floater").html(validationOutput[2]);
    }else{
        // is invalid, render error location
        $obj.addClass('ww_invalid');
        $obj.removeClass('ww_valid');
        $("#wwchecker-floater").html(validationOutput[2]+"<BR>"+spaces(validationOutput[1])+"<span class=ww_fail>^</span>");
    }
}