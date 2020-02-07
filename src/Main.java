import javax.sound.midi.MidiDevice;
import javax.sound.midi.MidiSystem;
import javax.sound.midi.MidiUnavailableException;

public class Main {

    public static void main(String[] args) throws MidiUnavailableException {

        MidiDevice.Info[] infos = MidiSystem.getMidiDeviceInfo();
        MidiDevice piano = null;
        for (MidiDevice.Info md : infos){
            piano = MidiSystem.getMidiDevice(md);
            piano.open();
            System.out.println("Get device info: " + piano.getDeviceInfo());
            System.out.println("Get max receivers: " + piano.getMaxReceivers());
            System.out.println("Get max transmitters: " + piano.getMaxTransmitters());
            System.out.println("Get microsecond position: " + piano.getMicrosecondPosition());
            System.out.println("Get receiver: " + piano.getReceiver());
            try {
                System.out.println("Get transmitter: " + piano.getTransmitter());
            } catch (MidiUnavailableException e){
                System.out.println("Error");
            }
        }
    }

}