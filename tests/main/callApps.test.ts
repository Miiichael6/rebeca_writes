import { describe, expect, it } from 'vitest'
import { callAppName, callAppsIn } from '../../src/main/domain/meeting/callApps'

describe('callAppName', () => {
  it('reconoce las apps de escritorio por la ruta NonPackaged del registro', () => {
    expect(callAppName('C:#Users#USER#AppData#Roaming#Zoom#bin#Zoom.exe')).toBe('Zoom')
    expect(callAppName('C:#Users#USER#AppData#Local#CiscoSparkLauncher#CiscoCollabHost.exe')).toBe(
      'Webex'
    )
    expect(callAppName('C:#Users#USER#AppData#Local#Discord#app-1.0.9244#DISCORD.EXE')).toBe(
      'Discord'
    )
  })

  it('reconoce las apps empaquetadas por su nombre de familia', () => {
    expect(callAppName('MSTeams_8wekyb3d8bbwe')).toBe('Teams')
    expect(callAppName('Microsoft.SkypeApp_kzf8qxf38zg5c')).toBe('Skype')
  })

  it('no cuenta los navegadores (D11)', () => {
    expect(callAppName('C:#Program Files#BraveSoftware#Brave-Browser#Application#brave.exe')).toBe(
      null
    )
    expect(callAppName('C:#Program Files#Google#Chrome#Application#chrome.exe')).toBeNull()
  })

  it('ignora el resto, incluida la propia grabación', () => {
    expect(callAppName('C:#Program Files#RebeccaWrites#resources#bin#rl-capture.exe')).toBeNull()
    expect(callAppName('Microsoft.WindowsSoundRecorder_8wekyb3d8bbwe')).toBeNull()
    expect(callAppName('C:#Program Files#obs-studio#bin#64bit#obs64.exe')).toBeNull()
  })
})

describe('callAppsIn', () => {
  it('nombra cada app de llamadas una vez', () => {
    expect(
      callAppsIn(['C:#Teams#ms-teams.exe', 'MSTeams_8wekyb3d8bbwe', 'C:#App#rl-capture.exe'])
    ).toEqual(['Teams'])
  })
})
