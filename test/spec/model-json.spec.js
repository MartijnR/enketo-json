if ( typeof define !== 'function' ) {
    var define = require( 'amdefine' )( module );
}

define( [ "FormModelJSON", "jquery", "jquery.xpath" ], function( FormModelJSON, $ ) {

    describe( "Conversion from Drishti-style JSON non-repeat form elements to an XML instance", function() {
        var data = mockInstances.a,
            jData = new FormModelJSON( data ),
            instanceXML = '<model><instance>' + jData.toXML() + '</instance></model>',
            $instance = $( $.parseXML( instanceXML ) );

        it( 'creates valid XML', function() {
            expect( $instance ).toBeTruthy();
        } );

        it( 'preserves cAsE of XML node names', function() {
            expect( $instance.find( 'instance>*:first' ).prop( 'nodeName' ) ).toEqual( 'EC_Registration_24_5_12' );
        } );

        function testDataValue( path, value ) {
            it( 'correctly adds non-repeat XML node with path ' + path + ' and value "' + value + '"', function() {
                expect( $instance.find( path.substring( 1 ).replace( /\//g, '>' ) ).text() ).toEqual( value );
            } );
        }

        for ( var i = 0; i < data.form.fields.length; i++ ) {
            if ( typeof data.form.fields[ i ].value !== 'undefined' ) {
                var bind = data.form.fields[ i ].bind || data.form.default_bind_path + data.form.fields[ i ].name;
                testDataValue( bind, data.form.fields[ i ].value );
            }
        }
    } );

    describe( "Converting Drishti-style JSON repeat form elements to an XML instance", function() {
        var no_trailing_slash_in_default_bind_path = jQuery.extend( {}, mockInstances.c ),
            bp = no_trailing_slash_in_default_bind_path.form.sub_forms[ 0 ].default_bind_path,
            instances = [ mockInstances.b, mockInstances.c, no_trailing_slash_in_default_bind_path ];
        no_trailing_slash_in_default_bind_path.form.sub_forms[ 0 ].default_bind_path = bp.substr( 0, bp.length - 1 );

        function testRepeatDataValue( $instance, path, value, index ) {
            it( 'correctly adds a repeat XML node with path ' + path + ', index ' + index + ' and value "' + value + '"', function() {
                console.log( 'instance', $instance[ 0 ] );
                expect( $instance.find( path.substring( 1 ).replace( /\//g, '>' ) ).eq( index ).text() ).toEqual( value );
            } );
        }

        for ( var g = 0; g < instances.length; g++ ) {
            var data = instances[ g ],
                jData = new FormModelJSON( data ),
                instanceXML = '<model><instance>' + jData.toXML() + '</instance></model>',
                $instance = $( $.parseXML( instanceXML ) );

            for ( var i = 0; i < data.form.sub_forms.length; i++ ) {
                var subForm = data.form.sub_forms[ i ];
                for ( var j = 0; j < subForm.instances.length; j++ ) {
                    for ( var name in subForm.instances[ j ] ) {
                        if ( [ 'id' ].indexOf( name ) == -1 ) { //skip non-bound properties (just 'id' for now)
                            var field = $.grep( subForm.fields, function( item ) {
                                return item.name === name;
                            } )[ 0 ];
                            var bind = ( field.bind ) ? field.bind : subForm.default_bind_path + name;
                            testRepeatDataValue( $instance, bind, subForm.instances[ j ][ name ], j );
                        }
                    }
                }
            }
        }
    } );

    describe( "Handles errors in JSON format", function() {
        //no root form property
        //field without name
        //field missing
        //subform missing
        //field in subform missing
        //subform bind_type missing
        //multiple fields with same name in main form
        //multiple fields with same name in a subform
    } );

    describe( "Updating JSON value properties for non-repeat form elements", function() {
        var origData, jData, $village, origVillage, $hh, origHh;

        beforeEach( function() {
            origData = jQuery.extend( true, {}, mockInstances.a );
            jData = new FormModelJSON( origData );
            jData.getInstanceXML = getFakeInstanceXML;
            setFakeInstance( 'EC_Registration_24_5_12' );

            $hh = $fakeInstance.find( 'house_number' );
            origHh = $.grep( origData.form.fields, function( field ) {
                return field.name === "household_number";
            } );

            $husband = $fakeInstance.find( 'husband_name' );
            origHusband = $.grep( origData.form.fields, function( field ) {
                return field.name === "husband_name";
            } );
        } );

        it( 'does NOT add a value property if it was missing before AND if the submitted value for that node is empty', function() {
            expect( $hh.length ).toEqual( 1 );
            expect( origHh.length ).toEqual( 1 );
            expect( origHh[ 0 ].value ).toBeUndefined();
            expect( $.grep( jData.get().form.fields, function( field ) {
                return field.name === "household_number";
            } )[ 0 ].value ).toBeUndefined();
        } );

        it( 'updates the value property if it was there before but the value changed', function() {
            //TODO
        } );

        it( 'adds a value property if it was missing before AND if the submitted value for that node is NOT empty', function() {
            $hh.text( '3045' );
            expect( $hh.length ).toEqual( 1 );
            expect( origHh.length ).toEqual( 1 );
            expect( origHh[ 0 ].value ).toBeUndefined();
            expect( $.grep( jData.get().form.fields, function( field ) {
                return field.name === "household_number";
            } )[ 0 ].value ).toEqual( '3045' );
        } );

        it( 'keeps the value property (but empties it) if the value changes from not empty to empty', function() {
            $husband.text( '' );
            expect( $husband.length ).toEqual( 1 );
            expect( origHusband.length ).toEqual( 1 );
            expect( origHusband[ 0 ].value ).toEqual( 'Suresh' );
            expect( $.grep( jData.get().form.fields, function( field ) {
                return field.name === "husband_name";
            } )[ 0 ].value ).toEqual( '' );
        } );

        it( 'does not change the JSON object if the get() (=update) function is called twice in a row', function() {
            $husband.text( 'Martijn' );
            $hh.text( '3045' );
            var first = jData.get();
            var second = jData.get();
            expect( first ).toEqual( second );
        } );

        it( 'does not include #document when determining the path of an XML Node', function() {
            expect( $husband.getXPath() ).toEqual( '/model/instance/EC_Registration_24_5_12/husband_name' );
            expect( $husband.getXPath( 'somethingthatisntthere' ) ).toEqual( '/model/instance/EC_Registration_24_5_12/husband_name' );
        } );
    } );

    describe( "Updating JSON value properties for repeat form elements", function() {
        var origData, jData, $c1, $c3;

        beforeEach( function() {
            origData = jQuery.extend( true, {}, mockInstances.b );
            jData = new FormModelJSON( origData );
            jData.getInstanceXML = getFakeInstanceXML;
            setFakeInstance( 'thedata.xml' );
            $c1 = $fakeInstance.find( 'nodeC' ).eq( 1 ); //template = 0
            $c3 = $fakeInstance.find( 'nodeC' ).eq( 3 );
        } );

        it( 'adds a value to the JSON subform if the value is not empty', function() {
            expect( jData.get().form.sub_forms[ 0 ].instances[ 1 ].nodeC ).toEqual( 'c2' );
            expect( jData.get().form.sub_forms[ 0 ].instances[ 2 ].nodeC ).toEqual( 'c3' );
        } );

        it( 'also adds a value to the JSON subform if the value is empty', function() {
            expect( jData.get().form.sub_forms[ 0 ].instances[ 0 ].nodeC ).toEqual( '' );
        } );

        it( 'updates values when they change', function() {
            $c1.text( 'new first value' );
            $c3.text( 'new third value' );
            expect( jData.get().form.sub_forms[ 0 ].instances[ 0 ].nodeC ).toEqual( 'new first value' );
            expect( jData.get().form.sub_forms[ 0 ].instances[ 2 ].nodeC ).toEqual( 'new third value' );
        } );

        it( 'preserves unbound JSON subform instance properties ("id")', function() {
            expect( jData.get().form.sub_forms[ 0 ].instances[ 2 ].id ).toEqual( "c397fdcd-f8dd-4d32-89a9-37030c01b40b" );
        } );
    } );

    xdescribe( "Translating back and forth from JSON to XML to JSON", function() {
        var transformer = new Transformer();

        function transformAndBackTest( name, submissionXML ) {
            it( "Results in the same original for form: " + name, function() {
                var jData = transformer.XMLToJSON( submissionXML );
                var xData = transformer.JSONToXML( jData );
                //for some reason JSONToXML doesn't output self-closing xml tags. To fix this:
                xData = new XMLSerializer().serializeToString( $( $.parseXML( xData ) )[ 0 ] );
                expect( xData ).toEqual( submissionXML );
            } );
        }

        for ( var formName in mockForms2 ) {
            if ( mockForms2.hasOwnProperty( formName ) ) {
                //strip model and instance nodes and namespace to simulate a submission
                //note: this test fails if the instance has template nodes
                var cleanedXML = mockForms2[ formName ].xml_model.replace( 'xmlns="http://www.w3.org/2002/xforms"', '' );
                var submissionXML = ( new XMLSerializer() ).serializeToString( $( $.parseXML( cleanedXML ) ).find( 'instance>*:first' )[ 0 ] );
                transformAndBackTest( formName, submissionXML );
            }
        }
    } );

} );
