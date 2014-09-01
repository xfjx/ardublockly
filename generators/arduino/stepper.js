/**
 * @fileoverview Blocks extension for Arduino Stepper library.
 * The Arduino Servo functions syntax can be found in the following URL
 * http://arduino.cc/en/Reference/Stepper
 * Additional functions apart from the normal generators have been added to be
 * able to generate the 'set' drop down menu with all current instaces of the
 * Stepper class:
 * Blockly.Arduino.stepper.allInstances
 * Blockly.Arduino.stepper.FieldSetterInstance
 * Blockly.Arduino.stepper.FieldSetterInstance.dropdownCreate
 * 
 * TODO: Still need to had some kind of handler to refresh the "set" drop down
 *       menu values if an instance in a 'configure' block is renamed.
 */
'use strict';

goog.provide('Blockly.Arduino.stepper');

goog.require('Blockly.Arduino');

goog.require('Blockly.FieldDropdown');


/**
 * Finds all user-created instances of the Stepper block config.
 * Based on Blockly.Variables.allVariables
 * @return {!Array.<string>} Array of instance names.
 */
Blockly.Arduino.stepper.allInstances = function() {
  var blocks = Blockly.mainWorkspace.getAllBlocks();
  var variableHash = Object.create(null);

  // Iterate through every block and add each Stetter config name to the hash.
  for (var x = 0; x < blocks.length; x++) {
    var func = blocks[x].getInstance;
    if (func) {
      var blockVariables = func.call(blocks[x]);
      for (var y = 0; y < blockVariables.length; y++) {
        var varName = blockVariables[y];
        // Variable name may be null if the block is only half-built.
        if (varName) {
          variableHash[varName.toLowerCase()] = varName;
        }
      }
    }
  }
  // Flatten the hash into a list.
  var variableList = [];
  for (var name in variableHash) {
    variableList.push(variableHash[name]);
  }

  return variableList;
};

/**
 * Class for a variable's dropdown field.
 * @param {Function} opt_changeHandler A function that is executed when a new
 *     option is selected.  Its sole argument is the new option value.  Its
 *     return value is ignored.
 * @extends {Blockly.FieldDropdown}
 * @constructor
 */
Blockly.Arduino.stepper.FieldSetterInstance = function() {
  Blockly.Arduino.stepper.FieldSetterInstance.superClass_.constructor.call(this,
      Blockly.Arduino.stepper.FieldSetterInstance.dropdownCreate);
};
goog.inherits(Blockly.Arduino.stepper.FieldSetterInstance, Blockly.FieldDropdown);

/**
 * Return a sorted list of instances names for set dropdown menu.
 * @return {!Array.<string>} Array of variable names.
 * @this {!Blockly.FieldSetterInstance}
 */
Blockly.Arduino.stepper.FieldSetterInstance.dropdownCreate = function() {
  var variableList = Blockly.Arduino.stepper.allInstances();
  variableList.sort(goog.string.caseInsensitiveCompare);
  // Variables are not language-specific, use the name as both the user-facing
  // text and the internal representation.
  var options = [];
  for (var x = 0; x < variableList.length; x++) {
    options[x] = [variableList[x], variableList[x]];
  }
  return options;
};

/**
 * Block for for the stepper generator configuration including creating
 * an object instance and setting up the speed. Info in the setHelpUrl link.
 * @this Blockly.Block
 */
Blockly.Blocks['stepper_configure'] = {
  /**
   * Block for Stepper configuration.
   * @this Blockly.Block
   */
  init: function() {
    this.setHelpUrl('http://arduino.cc/en/Reference/StepperConstructor');
    this.setColour(75);
    this.appendDummyInput()
        .appendField('Configure STEPPER:');
    this.appendDummyInput()
        .appendField('PIN1#')
        .appendField(new Blockly.FieldDropdown(profile.default.digital),
            'STEPPER_PIN1')
        .appendField('PIN2#')
        .appendField(new Blockly.FieldDropdown(profile.default.digital),
            'STEPPER_PIN2');
    this.appendValueInput('STEPPER_STEPS')
        .setCheck('Number')
        .appendField('Steps in one revolution');
    this.appendValueInput('STEPPER_SPEED')
        .setCheck('Number')
        .appendField('Set speed to');
    this.appendValueInput('STEPPER_NAME')
        .setCheck('String')
        .appendField('Set name to');
    this.setTooltip('');
    //this.contextMenuMsg_ = Blockly.Msg.VARIABLES_GET_CREATE_SET;
    //this.contextMenuType_ = 'stepper_step';
  },
  /**
   * Returns the stepper instance name, defined in the 'STEPPER_NAME' input
   * String block attached to this block.
   * @return {!Array.<string>} List with the instaces name.
   * @this Blockly.Block
   */
  getInstance: function() {
    var InstanceNamefromBlock;
    var targetBlock = this.getInputTargetBlock('STEPPER_NAME');
    if (!targetBlock) {
      InstanceNamefromBlock = 'Empty_input_name';
      this.setWarningText('A STEPPER configuration block needs to have a ' +
        'name to set the motor steps!');
    } else {
      InstanceNamefromBlock = targetBlock.getFieldValue('TEXT');
      this.setWarningText(null);
    }
    return [InstanceNamefromBlock];
  }
};

/**
 * Code generator for the stepper generator configuration. Nothing is added 
 * to the 'loop()' function, just the library define, global instance and 
 * a function call in 'setup()'.
 * @param {block} block Block to generate the code from.
 * @return {string} Empty string as no code goes into 'loop()' 
 */
Blockly.Arduino['stepper_configure'] = function(block) {
  var pin1 = block.getFieldValue('STEPPER_PIN1');
  var pin2 = block.getFieldValue('STEPPER_PIN2');
  var pin_type = profile.default.pin_types.STEPPER;
  var stepper_name = block.getInstance();
  var stepper_steps = Blockly.Arduino.valueToCode(block, 'STEPPER_STEPS',
      Blockly.Arduino.ORDER_ATOMIC) || '360';
  var stepper_speed = Blockly.Arduino.valueToCode(block, 'STEPPER_SPEED',
      Blockly.Arduino.ORDER_ATOMIC) || '90';
  var global_code = 'Stepper ' + stepper_name + '(' + stepper_steps + ', ' +
      pin1 + ', ' + pin2 + ');';
  var setup_code = stepper_name + '.setSpeed(' + stepper_speed + ');';

  // Maintain the setup regardless of pin conflict, warning should be enough
  Blockly.Arduino.definitions_['define_stepper'] = '#include <Stepper.h>\n';
  Blockly.Arduino.definitions_['global_stepper_' + stepper_name] = global_code;
  Blockly.Arduino.setups_['setup_stepper_' + stepper_name] = setup_code;

  // If the IO has been configured already set a block warning for the user
  var warning_text = '';
  if (pin1 in Blockly.Arduino.pins_) {
    if (Blockly.Arduino.pins_[pin1] != pin_type) {
      warning_text = 'Pin ' + pin1 + ' alredy used as ' +
          Blockly.Arduino.pins_[pin1] + '. ';
    }
  }
  if (pin2 in Blockly.Arduino.pins_) {
    if (Blockly.Arduino.pins_[pin2] != pin_type) {
      warning_text = warning_text + 'Pin ' + pin2 + ' alredy used as ' +
          Blockly.Arduino.pins_[pin2] + '. ';
    }
  }
  if (warning_text === '') {
    // First time this IO pin is used, so configure it
    Blockly.Arduino.pins_[pin1] = pin_type;
    Blockly.Arduino.pins_[pin2] = pin_type;
    block.setWarningText(null);
  } else {
    block.setWarningText(warning_text);
  }

  return '';
};

/**
 * Block for for the stepper 'step()' function.
 * @this Blockly.Block
 */
Blockly.Blocks['stepper_step'] = {
  init: function() {
    this.setHelpUrl('http://arduino.cc/en/Reference/StepperStep');
    this.setColour(75);
    this.interpolateMsg(
        // TODO: Combine these messages instead of using concatenation.
        'STEPPER' + ' %1 ' +
        'move' + ' %2' + 'steps',
        ['STEPPER_NAME', new Blockly.Arduino.stepper.FieldSetterInstance()],
        ['STEPPER_STEPS', 'Number', Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Turns the stepper motor a specific number of steps.');
  }
};

/**
 * Code generator for the stepper 'step()' function. Info in the setHelpUrl link.
 * @param {block} block Block to generate the code from.
 * @return {array} Completed code with order of operation.
 */
Blockly.Arduino['stepper_step'] = function(block) {
  var stepper_instance = block.getFieldValue('STEPPER_NAME');
  var stepper_steps = Blockly.Arduino.valueToCode(block, 'STEPPER_STEPS',
      Blockly.Arduino.ORDER_ATOMIC) || '0';
  var code = '';
  
  // Only write the code if an instance has been configured
  if (stepper_instance != 'Empty_input_name') {
    code = stepper_instance + '.steps(' + stepper_steps + ')';
    block.setWarningText(null);
  } else {
    block.setWarningText('A STEPPER configuration block has to be added in ' +
        'to be able to use this block!');
  }
  
  return [code, Blockly.Arduino.ORDER_ATOMIC];
};