document.getElementById('shorten-form').addEventListener('submit',(event)=> {
 event.preventDefault;
 const formData= new FormData(event.target)
 const url = formData.get('url');
 const shortcode = formData.get('shortcode')
 console.log(url)
})