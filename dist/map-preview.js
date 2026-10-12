// Focused map review keeps every action on this screen.
const mapPreviewSetScreen=setScreen;setScreen=function(){journeyActive=false;mapPreviewSetScreen('map')};
travel=function(){loading=false;dialog=false;announce('Выбрана локация: '+points[selected].full);render()};
