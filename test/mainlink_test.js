/*
 * JavaScript Code : 
*/

//This makes no sense; expression ( mItem < 3 || mItem > 9 ) is always false.
function test_removeClassItem(){
    var mItem = 5;
    if( mItem < 3 || mItem > 9 )
        assertTrue("mItem is between 3 and 9", false);
    else
        assertTrue("mItem is between 3 and 9", true);
};

function test_onMouseClickItem(){
    var oriStr = ["Error1", "Error1", "Error1", "item_engine", "item_engine", "item_power", "item_console", "item_components", "item_door", "item_wall"];
    var mItem = 3;
    var mRet = onMouseClickItem(oriStr[mItem]);
    if(mRet >= 3 && mRet <= 9)
    {
        assertEquals(mItem, select_item);
        assertNull(SelectObject);
        assertNull(WallMngObj);
        assertFalse(isDragable);
        assertFalse(wallDrawing);
    }
};

function test_drawObjectfromJstring(){
    var JString = '{"Obje" : 234, "sssef" : "sefee"}';
    assertFalse(drawObjectfromJstring(JString));
};