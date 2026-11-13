/* Salva um PDF do jsPDF sem a "ação de abertura" (/OpenAction).
   O jsPDF sempre grava no catálogo uma instrução para abrir a página ajustada à largura; o Adobe Acrobat
   trata isso como "ação incorporada" e mostra um aviso. A instrução é trocada por espaços do mesmo tamanho,
   então as posições internas do arquivo (tabela xref) continuam válidas. */
(function(){
  function salvarPDF(pdf, nome){
    var bytes = new Uint8Array(pdf.output('arraybuffer'));
    try{
      var ini = Math.max(0, bytes.length - 65536), cauda = '';
      for(var i=ini;i<bytes.length;i++) cauda += String.fromCharCode(bytes[i]);
      var re = /\/OpenAction\s*\[[^\]]*\]/g, m;
      while((m = re.exec(cauda))){
        for(var k=0;k<m[0].length;k++) bytes[ini + m.index + k] = 32;
      }
    }catch(e){ /* se algo der errado, salva como veio */ }
    var blob = new Blob([bytes], {type:'application/pdf'});
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nome || 'documento.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 30000);
  }
  window.salvarPDF = salvarPDF;
})();
