var options = {
  container: 'body',
  spacing: 20,
  colour:'black',
  actions: {
    next: {
      text: 'OK, what is next?',
      class: 'btn btn-default'
    },
    finish: {
      text: 'OK! Now I know',
      class: 'btn btn-success'
    }
  },
  entries: [
    {
      selector: '#step1',
      text: 'Welcome! to a 3D mesh editor.This animated 3D icon hides or displays the UI when you click on it.'
    }, {
      selector: '#step2',
      text: 'The upload feature allows you to import multiple .obj files from local machine into the scene.'
    }, 
    
    {
      selector: '#step3',
      text: 'The clipping features allows you cut the models and temporary save their clipped state. Use the control GUI on the other side of the screen to start clipping your models.'
    }, 
    {
      selector: '#step4',
      text: 'The merge feature allows you to merge the clipped models, simply choose the start model for the merge and the direction/region for merging with the second one. '
    }, 
    {
      selector: '#step5',
      text: 'The perfomance analysis feature allows to get a sense of the perfomance while all these processes are taking place.'
    }, 
    {
        selector: '#step6',
        text: 'Finally, the export feature allow the user to download the processed 3D model.'
      }, 
      
    
    
    {
      selector: '#step10',
      text: 'Congratulations for finishing the guide, you can now explore! Do not forget to hide the information toolbar.',
      onEnter: function () {
        $('#step10').text('Thank you!');
      },
      onExit: function () {
        $('#step10').text('Is all okay?');
      }
    }
  ]
};

PageIntro.init(options);
PageIntro.start();